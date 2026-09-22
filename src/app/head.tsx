export default function Head() {
  // Some browsers still default to requesting `/favicon.ico` unless an explicit <link rel="icon" />
  // is present. We point them to the brand SVG in `/public/images/logo.svg`.
  return (
    <>
      <link rel="icon" href="/images/logo.svg" type="image/svg+xml" />
      <link rel="shortcut icon" href="/images/logo.svg" type="image/svg+xml" />
    </>
  );
}

