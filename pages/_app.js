import '../styles/globals.css';
import Navbar from '../components/Navbar';

export default function App({ Component, pageProps }) {
  return (
    <div className="site-shell">
      <Navbar />
      <main className="page-wrapper">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
