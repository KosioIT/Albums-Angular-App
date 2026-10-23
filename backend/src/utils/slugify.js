import slugify from "slugify";

export function makeSlug(str) {
  return slugify(str, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  });
}
