import styles from './page-loader.module.css';

export function PageLoader() {
  return (
    <div className={styles.screen} role="status" aria-live="polite" aria-label="טוען את העמוד / Loading page">
      <div className={styles.mark} aria-hidden="true" dir="ltr">
        <span className={styles.word}>slate<span className={styles.dot}>.</span></span>
        <span className={styles.divider} />
        <span className={styles.product}>Sites</span>
      </div>
      <div className={styles.track} aria-hidden="true"><span /></div>
      <p className={styles.caption}>טוענים את העמוד <span aria-hidden="true">·</span> <span lang="en">Loading</span></p>
    </div>
  );
}
