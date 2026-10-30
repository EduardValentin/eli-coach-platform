export const CLIENT_GENDERS = ["female", "male", "prefer_not_to_say"] as const;

export type ClientGender = (typeof CLIENT_GENDERS)[number];
