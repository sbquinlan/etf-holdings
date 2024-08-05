// https://www.isin.org/education/
export function cusipToIsin(country: string, cusip: string): string {
  const numeric_rep = [
    ...`${country.toUpperCase()}${cusip}`.split('').flatMap((c) => {
      if (c.charCodeAt(0) < 65) {
        return c.charCodeAt(0) - 48;
      }
      const char_code = c.charCodeAt(0) - 55;
      return [Math.floor(char_code / 10), char_code % 10];
    }),
  ].reverse();
  const sum = numeric_rep.reduce((acc, c, i) => {
    return i % 2 === 1 ? acc + c : acc + (c < 5 ? c * 2 : (c - 5) * 2 + 1);
  }, 0);
  const check_digit_final = 10 - (sum % 10);
  return `${country}${cusip}${check_digit_final}`;
}

export function isinToCusip(cusip: string): string {
  return cusip.slice(2, -1).toUpperCase();
}
