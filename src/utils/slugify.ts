const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .normalize('NFD') // Normalize accentuation
    .replace(/[\u0300-\u036f]/g, ''); // Remove accentuation
};

export default slugify;




















