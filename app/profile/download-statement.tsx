/*  DownloadStatement.tsx - Modern Statement Generator */
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import { Stack, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Divider, RadioButton, Switch, Text } from "react-native-paper";
import { Transaction, useApp } from "../../context/AppContext";

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */
const COLORS = {
  primary: "#6200EE",
  primaryLight: "#7C3AED",
  accent: "#F3F0FF",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  background: "#F8F9FA",
  card: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  shadow: "#000",
};

const SPACING = 16;
const CARD_RADIUS = 16;

/* ------------------------------------------------------------------ */
/*  Helper – convert any Firestore date to a real Date object          */
/* ------------------------------------------------------------------ */
const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value?.toDate && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
const DownloadStatement = () => {
  const router = useRouter();
  const { transactions, loading, userProfile } = useApp();

  const [exporting, setExporting] = useState(false);
  
  // Date Range
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "90days" | "custom">("30days");
  const [customFromDate, setCustomFromDate] = useState<Date | null>(null);
  const [customToDate, setCustomToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Transaction Filters
  const [includeCredits, setIncludeCredits] = useState(true);
  const [includeDebits, setIncludeDebits] = useState(true);
  const [includePending, setIncludePending] = useState(false);
  const [includeFailed, setIncludeFailed] = useState(false);

  // Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Format Options
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [groupByCategory, setGroupByCategory] = useState(false);

  /* -------------------- DATE CALCULATION -------------------- */
  const getDateRange = (): { from: Date; to: Date } => {
    const now = new Date();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let from: Date;

    if (dateRange === "custom") {
      from = customFromDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from, to: customToDate || to };
    }

    const daysMap = { "7days": 7, "30days": 30, "90days": 90 };
    const days = daysMap[dateRange];
    from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);

    return { from, to };
  };

  /* -------------------- FILTER LOGIC -------------------- */
  const filteredTransactions = useMemo(() => {
    const { from, to } = getDateRange();
    
    return transactions.filter((tx) => {
      const txDate = toDate(tx.date);
      if (txDate < from || txDate > to) return false;

      if (!includeCredits && tx.type === "credit") return false;
      if (!includeDebits && tx.type === "debit") return false;

      const status = (tx.status || "success").toLowerCase();
      if (status === "pending" && !includePending) return false;
      if (status === "failed" && !includeFailed) return false;

      if (selectedCategories.length > 0 && !selectedCategories.includes(tx.category)) return false;

      return true;
    });
  }, [transactions, dateRange, customFromDate, customToDate, includeCredits, includeDebits, includePending, includeFailed, selectedCategories]);

  /* -------------------- CATEGORY EXTRACTION -------------------- */
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(tx => tx.category && cats.add(tx.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  /* -------------------- DATE FORMATTERS -------------------- */
  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDateTime = (value: any) => {
    const d = toDate(value);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  /* -------------------- CSV EXPORT -------------------- */


  /* -------------------- 
  const exportCSV = async () => {
    if (!filteredTransactions.length) {
      Alert.alert("No data", "No transactions match your filters.");
      return;
    }

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      Alert.alert("Error", "File system not available.");
      return;
    }

    setExporting(true);
    try {
      const header = ["Date & Time", "Description", "Category", "Type", "Amount (₦)", "Status"];
      const rows = filteredTransactions.map((tx) => [
        `"${formatDateTime(tx.date)}"`,
        `"${(tx.description ?? "").replace(/"/g, '""')}"`,
        tx.category ?? "",
        tx.type ?? "",
        (tx.amount ?? 0).toLocaleString(),
        tx.status ?? "success",
      ]);

      const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
      
      const fileUri = `${cacheDir}statement_${new Date()
        .toISOString()
        .split("T")[0]}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: "utf8" });
      await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Share Statement" });
      
      Alert.alert("✅ Success", "CSV statement exported successfully!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to export CSV. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  -------------------- */


  /* -------------------- PDF EXPORT -------------------- */
  const exportPDF = async () => {
    if (!filteredTransactions.length) {
      Alert.alert("No data", "No transactions match your filters.");
      return;
    }
    setExporting(true);
    try {
      const { from, to } = getDateRange();
      
      let txData = [...filteredTransactions];
      let bodyContent = "";

      if (groupByCategory) {
        const grouped = txData.reduce((acc, tx) => {
          const cat = tx.category || "Uncategorized";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(tx);
          return acc;
        }, {} as Record<string, Transaction[]>);

        bodyContent = Object.entries(grouped).map(([category, txs]) => {
          const categoryTotal = txs.reduce((sum, t) => sum + (t.type === "debit" ? -t.amount : t.amount), 0);
          const rows = txs.map(tx => `
            <tr>
              <td>${formatDateTime(tx.date)}</td>
              <td>${tx.description ?? "—"}</td>
              <td style="text-transform:capitalize;">${tx.type}</td>
              <td style="text-align:right;">₦${(tx.amount ?? 0).toLocaleString()}</td>
              <td style="text-align:center;"><span style="color:${getStatusColor(tx.status)};font-weight:600;">${tx.status || "success"}</span></td>
            </tr>
          `).join("");

          return `
            <div style="margin-top:24px;">
              <h3 style="color:${COLORS.primary};margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid ${COLORS.accent};">
                ${category} 
                <span style="float:right;font-size:16px;">₦${Math.abs(categoryTotal).toLocaleString()}</span>
              </h3>
              <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                <thead>
                  <tr style="background:${COLORS.accent};">
                    <th style="padding:10px;text-align:left;border:1px solid #ddd;">Date</th>
                    <th style="padding:10px;text-align:left;border:1px solid #ddd;">Description</th>
                    <th style="padding:10px;text-align:left;border:1px solid #ddd;">Type</th>
                    <th style="padding:10px;text-align:right;border:1px solid #ddd;">Amount</th>
                    <th style="padding:10px;text-align:center;border:1px solid #ddd;">Status</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        }).join("");
      } else {
        const rows = txData.map(tx => `
          <tr>
            <td>${formatDateTime(tx.date)}</td>
            <td>${tx.description ?? "—"}</td>
            <td>${tx.category ?? "—"}</td>
            <td style="text-transform:capitalize;">${tx.type}</td>
            <td style="text-align:right;">₦${(tx.amount ?? 0).toLocaleString()}</td>
            <td style="text-align:center;"><span style="color:${getStatusColor(tx.status)};font-weight:600;">${tx.status || "success"}</span></td>
          </tr>
        `).join("");

        bodyContent = `
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <thead>
              <tr style="background:${COLORS.accent};">
                <th style="padding:12px;text-align:left;border:1px solid #ddd;">Date</th>
                <th style="padding:12px;text-align:left;border:1px solid #ddd;">Description</th>
                <th style="padding:12px;text-align:left;border:1px solid #ddd;">Category</th>
                <th style="padding:12px;text-align:left;border:1px solid #ddd;">Type</th>
                <th style="padding:12px;text-align:right;border:1px solid #ddd;">Amount</th>
                <th style="padding:12px;text-align:center;border:1px solid #ddd;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      const totalDebit = filteredTransactions
        .filter((t) => t.type === "debit")
        .reduce((s, t) => s + (t.amount ?? 0), 0);
      const totalCredit = filteredTransactions
        .filter((t) => t.type === "credit")
        .reduce((s, t) => s + (t.amount ?? 0), 0);

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width,initial-scale=1"/>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; background: #fff; }
              .header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid ${COLORS.primary}; }
              .logo { font-size: 32px; font-weight: bold; color: ${COLORS.primary}; margin-bottom: 8px; }
              .period { font-size: 14px; color: #666; margin-top: 12px; }
              .user-info { background: ${COLORS.accent}; padding: 20px; border-radius: 12px; margin-bottom: 24px; }
              .user-info p { margin: 6px 0; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background: ${COLORS.accent}; font-weight: 600; }
              tbody tr:nth-child(even) { background: #f9f9f9; }
              .summary { margin-top: 32px; padding: 24px; background: linear-gradient(135deg, ${COLORS.accent}, #fff); border-radius: 12px; border-left: 4px solid ${COLORS.primary}; }
              .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; }
              .summary-row.net { font-size: 20px; font-weight: bold; color: ${COLORS.primary}; border-top: 2px solid ${COLORS.primary}; margin-top: 12px; padding-top: 16px; }
              .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
            </style>
          </head>
          <body>
            ${includeHeader ? `
              <div class="header">
                <div class="logo">📊 Account Statement</div>
                <p style="color:#666;font-size:14px;">Generated on ${new Date().toLocaleString()}</p>
                <p class="period">Period: ${formatDateShort(from)} - ${formatDateShort(to)}</p>
              </div>
              <div class="user-info">
                <p><strong>Account Holder:</strong> ${userProfile?.fullName || "—"}</p>
                <p><strong>Email:</strong> ${userProfile?.email || "—"}</p>
                <p><strong>Transactions:</strong> ${filteredTransactions.length} records</p>
              </div>
            ` : ""}
            
            ${bodyContent}
            
            ${includeSummary ? `
              <div class="summary">
                <h3 style="color:${COLORS.primary};margin-bottom:16px;">Transaction Summary</h3>
                <div class="summary-row">
                  <span>Total Credits (+):</span>
                  <span style="color:${COLORS.success};font-weight:600;">₦${totalCredit.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                  <span>Total Debits (-):</span>
                  <span style="color:${COLORS.error};font-weight:600;">₦${totalDebit.toLocaleString()}</span>
                </div>
                <div class="summary-row net">
                  <span>Net Flow:</span>
                  <span>₦${(totalCredit - totalDebit).toLocaleString()}</span>
                </div>
              </div>
            ` : ""}
            
            <div class="footer">
              <p>This is a system-generated statement. For queries, contact support.</p>
            </div>
          </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
      
      Alert.alert("✅ Success", "PDF statement generated successfully!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status?: string) => {
    const s = (status ?? "success").toLowerCase();
    if (s === "success") return COLORS.success;
    if (s === "failed") return COLORS.error;
    if (s === "pending") return COLORS.warning;
    return "#999";
  };

  const handleGenerate = () => {
    if (format === "csv") {
        Alert.alert("Coming Soon", "CSV export is coming soon. Please use PDF for now.");
    } else {
      exportPDF();
    }
  };

  /* -------------------- UI -------------------- */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  const { from, to } = getDateRange();

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Generate Statement",
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: "#fff",
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable 
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* SUMMARY CARD */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.summaryHeader}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="file-invoice" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryTitle}>Statement Preview</Text>
                <Text style={styles.summarySubtitle}>
                  {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
                </Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Period</Text>
                <Text style={styles.statValue}>{formatDateShort(from)}</Text>
                <Text style={styles.statValueSecondary}>to</Text>
                <Text style={styles.statValue}>{formatDateShort(to)}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Format</Text>
                <View style={styles.formatBadge}>
                  <FontAwesome5 
                    name={format === "pdf" ? "file-pdf" : "file-excel"} 
                    size={20} 
                    color={format === "pdf" ? COLORS.error : COLORS.success} 
                  />
                  <Text style={styles.formatText}>{format.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* DATE RANGE SELECTION */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="calendar-alt" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Select Period</Text>
            </View>
            <RadioButton.Group value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              {[
                { value: "7days", label: "Last 7 Days" },
                { value: "30days", label: "Last 30 Days" },
                { value: "90days", label: "Last 90 Days" },
                { value: "custom", label: "Custom Range" },
              ].map((option) => (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    styles.radioRow,
                    pressed && styles.radioRowPressed,
                  ]}
                  onPress={() => setDateRange(option.value as any)}
                >
                  <RadioButton value={option.value} color={COLORS.primary} />
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </RadioButton.Group>

            {dateRange === "custom" && (
              <View style={styles.customDateRow}>
                <Button
                  mode="outlined"
                  onPress={() => setShowFromPicker(true)}
                  style={styles.dateBtn}
                  icon="calendar"
                  textColor={COLORS.primary}
                >
                  {customFromDate ? formatDateShort(customFromDate) : "From Date"}
                </Button>
                <FontAwesome5 name="arrow-right" size={16} color={COLORS.textSecondary} />
                <Button
                  mode="outlined"
                  onPress={() => setShowToPicker(true)}
                  style={styles.dateBtn}
                  icon="calendar"
                  textColor={COLORS.primary}
                >
                  {customToDate ? formatDateShort(customToDate) : "To Date"}
                </Button>
              </View>
            )}
            {(showFromPicker || showToPicker) && (
              <DateTimePicker
                mode="date"
                value={showFromPicker ? customFromDate ?? new Date() : customToDate ?? new Date()}
                onChange={(_, date) => {
                  if (showFromPicker) {
                    setShowFromPicker(false);
                    date && setCustomFromDate(date);
                  } else {
                    setShowToPicker(false);
                    date && setCustomToDate(date);
                  }
                }}
              />
            )}
          </Card.Content>
        </Card>

        {/* TRANSACTION TYPE FILTERS */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="exchange-alt" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Transaction Types</Text>
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <FontAwesome5 name="arrow-down" size={16} color={COLORS.success} />
                <Text style={styles.switchLabel}>Include Credits</Text>
              </View>
              <Switch value={includeCredits} onValueChange={setIncludeCredits} color={COLORS.primary} />
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <FontAwesome5 name="arrow-up" size={16} color={COLORS.error} />
                <Text style={styles.switchLabel}>Include Debits</Text>
              </View>
              <Switch value={includeDebits} onValueChange={setIncludeDebits} color={COLORS.primary} />
            </View>
            <Divider style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <FontAwesome5 name="clock" size={16} color={COLORS.warning} />
                <Text style={styles.switchLabel}>Include Pending</Text>
              </View>
              <Switch value={includePending} onValueChange={setIncludePending} color={COLORS.warning} />
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <FontAwesome5 name="times-circle" size={16} color={COLORS.error} />
                <Text style={styles.switchLabel}>Include Failed</Text>
              </View>
              <Switch value={includeFailed} onValueChange={setIncludeFailed} color={COLORS.error} />
            </View>
          </Card.Content>
        </Card>

        {/* CATEGORY FILTER */}
        {allCategories.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <FontAwesome5 name="tags" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Filter by Categories</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                {selectedCategories.length === 0 
                  ? "All categories included" 
                  : `${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'} selected`}
              </Text>
              <View style={styles.categoryGrid}>
                {allCategories.map((cat) => (
                  <Pressable
                    key={cat}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      selectedCategories.includes(cat) && styles.categoryChipActive,
                      pressed && styles.categoryChipPressed,
                    ]}
                    onPress={() => toggleCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategories.includes(cat) && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* FORMAT OPTIONS */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="file-alt" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Export Format</Text>
            </View>
            <RadioButton.Group value={format} onValueChange={(v: any) => setFormat(v)}>
              <Pressable 
                style={({ pressed }) => [
                  styles.radioRow,
                  pressed && styles.radioRowPressed,
                ]} 
                onPress={() => setFormat("pdf")}
              >
                <RadioButton value="pdf" color={COLORS.primary} />
                <FontAwesome5 name="file-pdf" size={20} color={COLORS.error} style={styles.formatIcon} />
                <Text style={styles.radioLabel}>PDF Document</Text>
              </Pressable>
              <Pressable 
                style={({ pressed }) => [
                  styles.radioRow,
                  pressed && styles.radioRowPressed,
                ]} 
                onPress={() => setFormat("csv")}
              >
                <RadioButton value="csv" color={COLORS.primary} />
                <FontAwesome5 name="file-excel" size={20} color={COLORS.success} style={styles.formatIcon} />
                <Text style={styles.radioLabel}>CSV Spreadsheet</Text>
              </Pressable>
            </RadioButton.Group>

            {format === "pdf" && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.cardHeader}>
                  <FontAwesome5 name="palette" size={18} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>PDF Customization</Text>
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Include Header & Account Info</Text>
                  <Switch value={includeHeader} onValueChange={setIncludeHeader} color={COLORS.primary} />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Include Summary Section</Text>
                  <Switch value={includeSummary} onValueChange={setIncludeSummary} color={COLORS.primary} />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Group by Category</Text>
                  <Switch value={groupByCategory} onValueChange={setGroupByCategory} color={COLORS.primary} />
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* GENERATE BUTTON */}
        <Button
          mode="contained"
          onPress={handleGenerate}
          loading={exporting}
          disabled={exporting || filteredTransactions.length === 0}
          style={styles.generateBtn}
          contentStyle={styles.generateBtnContent}
          icon="download"
          buttonColor={COLORS.primary}
          labelStyle={styles.generateBtnLabel}
        >
          {exporting ? "Generating..." : `Generate ${format.toUpperCase()} Statement`}
        </Button>

        {/* WARNING */}
        {filteredTransactions.length === 0 && (
          <Card style={styles.warningCard}>
            <Card.Content>
              <View style={styles.warningContent}>
                <View style={styles.warningIconContainer}>
                  <FontAwesome5 name="exclamation-triangle" size={24} color={COLORS.warning} />
                </View>
                <View style={styles.warningTextContainer}>
                  <Text style={styles.warningTitle}>No Transactions Found</Text>
                  <Text style={styles.warningText}>
                    No transactions match your current filters. Please adjust your selection to generate a statement.
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </>
  );
};

export default DownloadStatement;

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding:
     SPACING,
    paddingBottom: 40,
  },
  backButton: {
    paddingLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  /* Summary Card */
  summaryCard: {
    marginBottom: 20,
    borderRadius: CARD_RADIUS,
    elevation: 4,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: COLORS.border,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statValueSecondary: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 4,
  },
  formatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  formatText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },

  /* Card */
  card: {
    marginBottom: 16,
    borderRadius: CARD_RADIUS,
    elevation: 2,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginTop: -8,
  },

  /* Radio Buttons */
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  radioRowPressed: {
    backgroundColor: COLORS.background,
  },
  radioLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  formatIcon: {
    marginLeft: 8,
    marginRight: 4,
  },

  /* Custom Date */
  customDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  dateBtn: {
    flex: 1,
    borderColor: COLORS.primary,
  },

  /* Switches */
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  /* Categories */
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipPressed: {
    opacity: 0.7,
  },
  categoryChipText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: COLORS.card,
    fontWeight: "700",
  },

  /* Generate Button */
  generateBtn: {
    marginTop: 8,
    borderRadius: 12,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  generateBtnContent: {
    paddingVertical: 12,
  },
  generateBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
  },

  /* Warning Card */
  warningCard: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: `${COLORS.warning}15`,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    elevation: 2,
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  warningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.warning}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});