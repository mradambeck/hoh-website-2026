import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import YoutubeEmbedLoadingState from "@components/youtube-embed-loading-state/YoutubeEmbedLoadingState";
import styles from "./YoutubeEmbed.module.css";

interface Props {
  id: string;
  title: string;
  className?: string;
}

const YoutubeEmbed = ({ id, title, className }: Props) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={styles.wrapper}>
      <AnimatePresence>
        {!loaded && (
          <motion.div
            className={styles.loadingOverlay}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <YoutubeEmbedLoadingState />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.iframe
        className={
          className
            ? `${styles.youtubeEmbed} ${className}`
            : styles.youtubeEmbed
        }
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        width="560"
        height="315"
        src={`https://www.youtube.com/embed/${id}?si=c31uJ-uvde9Z9EaM`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        onLoad={() => setLoaded(true)}
      ></motion.iframe>
    </div>
  );
};

export default YoutubeEmbed;
