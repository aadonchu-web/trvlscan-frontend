export type Title = "mr" | "mrs" | "ms" | "miss" | "dr";
export type Gender = "m" | "f";

export interface PassengerData {
  // Identity
  title: Title;
  gender: Gender;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD

  // Contact
  email: string;
  phone: string; // E.164 format e.g. +971501234567

  // Travel documents (required by Duffel for international flights)
  nationality: string; // ISO 3166-1 alpha-2 e.g. AE
  passportNumber: string;
  passportExpiry: string; // YYYY-MM-DD
  passportIssuingCountry: string; // ISO 3166-1 alpha-2
}

export const TITLE_OPTIONS: { value: Title; label: string }[] = [
  { value: "mr", label: "Mr" },
  { value: "mrs", label: "Mrs" },
  { value: "ms", label: "Ms" },
  { value: "miss", label: "Miss" },
  { value: "dr", label: "Dr" },
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "m", label: "Male" },
  { value: "f", label: "Female" },
];
