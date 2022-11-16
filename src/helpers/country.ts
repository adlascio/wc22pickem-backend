import { iso31661, iso31662 } from "iso-3166";

export const getName = (code: string) => {
  if (code.length === 2) {
    const country = iso31661.find((c) => c.alpha2 === code);
    return country ? country.name : undefined;
  } else {
    const country = iso31662.find((c) => c.code === code);
    return country ? country.name : undefined;
  }
};
