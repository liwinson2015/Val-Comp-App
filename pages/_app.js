// pages/_app.js
import "../styles/globals.css";
import Navbar from "../components/Navbar"; // <- make sure file is exactly "Navbar.js"

export default function App({ Component, pageProps }) {
  return (
    <>
      <Navbar />
      <Component {...pageProps} />
    </>
  );
}
