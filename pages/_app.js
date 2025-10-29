// pages/_app.js
import SiteHeader from "../components/SiteHeader";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <SiteHeader />
      <Component {...pageProps} />
    </>
  );
}
