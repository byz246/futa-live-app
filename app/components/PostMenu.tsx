"use client";

type Choice =
  | "Student Marketplace"
  | "Food & Snacks"
  | "Tutorials Available"
  | "Lost & Found";

const OPTIONS: { section: Choice; icon: string; title: string; text: string }[] = [
  {
    section: "Student Marketplace",
    icon: "🛍️",
    title: "Sell a product",
    text: "Post something for sale to fellow students.",
  },
  {
    section: "Food & Snacks",
    icon: "🍔",
    title: "Post food",
    text: "Share food or snacks you are selling.",
  },
  {
    section: "Tutorials Available",
    icon: "📚",
    title: "Post a tutorial",
    text: "Tell students about a free tutorial.",
  },
  {
    section: "Lost & Found",
    icon: "🔎",
    title: "Report an item",
    text: "Report something lost or found.",
  },
];

export default function PostMenu({
  onPick,
  onClose,
}: {
  onPick: (section: Choice) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="pm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="pm-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-title"
      >
        <div className="pm-head">
          <div>
            <h2 id="pm-title">Create a post</h2>
            <p>What would you like to post?</p>
          </div>
          <button className="pm-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="pm-list">
          {OPTIONS.map((option) => (
            <button
              key={option.section}
              className="pm-option"
              onClick={() => onPick(option.section)}
            >
              <span className="pm-icon">{option.icon}</span>
              <span className="pm-copy">
                <strong>{option.title}</strong>
                <small>{option.text}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <style jsx>{`
        .pm-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
        }
        .pm-sheet {
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-sizing: border-box;
          background: #101827;
          border-radius: 20px 20px 0 0;
          padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
          color: #ffffff;
        }
        .pm-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .pm-head h2 {
          margin: 0 0 4px;
          font-size: 1.3rem;
        }
        .pm-head p {
          margin: 0;
          opacity: 0.7;
        }
        .pm-close {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          color: #ffffff;
          font-size: 20px;
          cursor: pointer;
        }
        .pm-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pm-option {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          box-sizing: border-box;
          text-align: left;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #080d18;
          color: #ffffff;
          cursor: pointer;
          min-width: 0;
        }
        .pm-icon {
          font-size: 1.6rem;
        }
        .pm-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .pm-copy small {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}