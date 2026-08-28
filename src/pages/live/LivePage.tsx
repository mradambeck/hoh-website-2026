import { getUpcomingShows } from "@lib/shows";
import Show from "@components/show/Show";
import jsonLD from "@utils/json-ld";
import { generateISO } from "@utils/date";
import styles from "./LivePage.module.css";

function LivePage() {
  const shows = getUpcomingShows();
  return (
    <>
      <title>Live & Tour Dates | Houses of Heaven</title>
      <div className={styles.livePage}>
        <section className={styles.content}>
          <h2 className={styles.header}>LIVE</h2>
          {shows.length === 0 ? (
            <p className={styles.noShows}>
              No upcoming shows are currently announced.
            </p>
          ) : (
            <ul className={styles.list}>
              {shows.map((show, i) => (
                <Show
                  key={`${show.date}-${show.venue}`}
                  show={show}
                  index={i}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
      {jsonLD({
        "@context": "https://schema.org",
        "@graph": [
          ...shows.map((show) => ({
            "@type": "MusicEvent",
            eventAttendanceMode:
              "https://schema.org/OfflineEventAttendanceMode",
            eventStatus: "https://schema.org/EventScheduled",
            ...(show.eventName
              ? { name: `Houses of Heaven at ${show.eventName}` }
              : {
                  name: `${["Houses of Heaven", ...show.lineup].join(", ")} at ${show.venue}`,
                }),
            ...(show.date && show.showTime
              ? { startDate: generateISO(show.date, show.showTime) }
              : { startDate: show.date }),
            ...(show.doorTime
              ? { doorTime: generateISO(show.date, show.doorTime) }
              : {}),
            performer: [
              {
                "@type": "MusicGroup",
                name: "Houses of Heaven",
              },
              ...(show.lineup.length > 0
                ? show.lineup.map((artist) => ({
                    "@type": "MusicGroup",
                    name: artist,
                  }))
                : []),
            ],
            location: {
              "@type": "Place",
              name: show.venue,
              address: {
                "@type": "PostalAddress",
                addressLocality: show.city,
                ...(show.state ? { addressRegion: show.state } : {}),
                ...(show.country ? { addressCountry: show.country } : {}),
              },
            },
            ...(show.ticketUrl
              ? {
                  offers: {
                    "@type": "Offer",
                    url: show.ticketUrl,
                    availability: "https://schema.org/InStock",
                  },
                }
              : {}),
          })),
        ],
      })}
    </>
  );
}

export default LivePage;
