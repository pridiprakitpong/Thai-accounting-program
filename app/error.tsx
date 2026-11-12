"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="site">
      <div className="card stack">
        <h1>Something went wrong</h1>
        <p>{error.message}</p>
        <button className="btn btn-primary" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
