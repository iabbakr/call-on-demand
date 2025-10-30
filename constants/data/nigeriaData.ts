// ✅ Define all valid Nigerian states as constants
export const STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

// ✅ Derive a literal type from the state list
export type StateName = (typeof STATES)[number];

// ✅ Define the main type
export type NigeriaDataType = Record<StateName, string[]>;

// ✅ Actual data object (fully typed)
export const NIGERIA_STATES_AND_CITIES: NigeriaDataType = {
  Abia: ["Aba", "Umuahia", "Ohafia", "Arochukwu", "Isuikwuato"],
  Adamawa: ["Yola", "Mubi", "Numan", "Ganye", "Jimeta"],
  "Akwa Ibom": ["Uyo", "Eket", "Ikot Ekpene", "Oron", "Abak"],
  Anambra: ["Awka", "Onitsha", "Nnewi", "Ihiala", "Ekwulobia"],
  Bauchi: ["Bauchi", "Azare", "Misau", "Jama’are", "Katagum"],
  Bayelsa: ["Yenagoa", "Ogbia", "Nembe", "Brass", "Sagbama"],
  Benue: ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala", "Vandeikya"],
  Borno: ["Maiduguri", "Biu", "Monguno", "Gwoza", "Damboa"],
  "Cross River": ["Calabar", "Ikom", "Ogoja", "Obudu", "Akamkpa"],
  Delta: ["Asaba", "Warri", "Ughelli", "Sapele", "Agbor"],
  Ebonyi: ["Abakaliki", "Afikpo", "Onueke", "Ezza", "Ikwo"],
  Edo: ["Benin City", "Auchi", "Ekpoma", "Uromi", "Iguobazuwa"],
  Ekiti: ["Ado-Ekiti", "Ikere-Ekiti", "Ise-Ekiti", "Omuo-Ekiti", "Aramoko-Ekiti"],
  Enugu: ["Enugu", "Nsukka", "Awgu", "Udi", "Oji River"],
  FCT: ["Abuja", "Gwagwalada", "Bwari", "Kuje", "Kwali"],
  Gombe: ["Gombe", "Dukku", "Kaltungo", "Billiri", "Nafada"],
  Imo: ["Owerri", "Orlu", "Okigwe", "Oguta", "Mbaise"],
  Jigawa: ["Dutse", "Hadejia", "Gumel", "Kazaure", "Birnin Kudu"],
  Kaduna: ["Kaduna", "Zaria", "Kafanchan", "Soba", "Makarfi"],
  Kano: ["Kano", "Wudil", "Bichi", "Gaya", "Rano"],
  Katsina: ["Katsina", "Daura", "Funtua", "Dutsin-Ma", "Malumfashi"],
  Kebbi: ["Birnin Kebbi", "Argungu", "Yauri", "Zuru", "Jega"],
  Kogi: ["Lokoja", "Okene", "Kabba", "Anyigba", "Idah"],
  Kwara: ["Ilorin", "Offa", "Omu-Aran", "Jebba", "Patigi"],
  Lagos: ["Lagos", "Ikeja", "Epe", "Badagry", "Ikorodu"],
  Nasarawa: ["Lafia", "Keffi", "Akwanga", "Nasarawa", "Karu"],
  Niger: ["Minna", "Bida", "Suleja", "Kontagora", "Mokwa"],
  Ogun: ["Abeokuta", "Ijebu-Ode", "Sagamu", "Ota", "Ilaro"],
  Ondo: ["Akure", "Ondo Town", "Owo", "Ikare-Akoko", "Okitipupa"],
  Osun: ["Osogbo", "Ile-Ife", "Ilesa", "Ede", "Iwo"],
  Oyo: ["Ibadan", "Ogbomoso", "Oyo", "Saki", "Iseyin"],
  Plateau: ["Jos", "Pankshin", "Barkin Ladi", "Langtang", "Shendam"],
  Rivers: ["Port Harcourt", "Bonny", "Bori", "Ahoada", "Omoku"],
  Sokoto: ["Sokoto", "Wurno", "Tambuwal", "Gwadabawa", "Isa"],
  Taraba: ["Jalingo", "Wukari", "Bali", "Takum", "Gembu"],
  Yobe: ["Damaturu", "Potiskum", "Gashua", "Geidam", "Nguru"],
  Zamfara: ["Gusau", "Kaura Namoda", "Anka", "Talata Mafara", "Maru"],
};

// ✅ Small helpers (fully typed)
export const getStates = (): readonly StateName[] => STATES;

export const getCitiesByState = (state: StateName): string[] =>
  NIGERIA_STATES_AND_CITIES[state] || [];
