import { DetailView } from './components/detail';
import { Gallery } from './components/gallery';
import { Hero } from './components/hero';
import { useHashRoute } from './router';
import { WordmarkPage } from './wordmark/wordmark';

const Footer = () => (
  <footer className="site-footer">
    <span className="site-footer__links">
      <a href="https://github.com/flawnn/asciitopia" rel="noreferrer" target="_blank">
        github
      </a>
      <a href="https://www.npmjs.com/org/asciitopia" rel="noreferrer" target="_blank">
        npm
      </a>
    </span>
  </footer>
);

export const App = () => {
  const route = useHashRoute();

  if (route.view === 'detail') return <DetailView id={route.id} />;
  if (route.view === 'wordmark') return <WordmarkPage />;

  return (
    <>
      <Hero />
      <Gallery />
      <Footer />
    </>
  );
};
