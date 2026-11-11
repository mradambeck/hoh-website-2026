import { Link } from "react-router-dom";
import styles from "./NotFoundPage.module.css";

const NotFoundPage = () => (
  <>
    <title>Page Not Found | Houses of Heaven</title>
    <meta name="robots" content="noindex" />
    <div className={styles.notFoundPage}>
      <section className={styles.content}>
        <h2 className={styles.code}>404</h2>
        <p className={styles.message}>This page was not found.</p>
        <Link to="/" className={styles.homeLink}>
          Back to home
        </Link>
      </section>
    </div>
  </>
);

export default NotFoundPage;
