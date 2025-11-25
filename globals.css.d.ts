// TypeScript declaration for CSS modules
// This file tells TypeScript that .css imports are valid

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "./globals.css" {
  const content: Record<string, string>;
  export default content;
}
