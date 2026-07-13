import { DetailView } from './components/detail';
import { Gallery } from './components/gallery';
import { Hero } from './components/hero';
import { useHashRoute } from './router';

const Footer = () => (
  <footer className="site-footer">
    <span>MIT · asciitopia</span>
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

  return (
    <>
      <Hero />
      <Gallery />
      <Footer />
    </>
  );
};
