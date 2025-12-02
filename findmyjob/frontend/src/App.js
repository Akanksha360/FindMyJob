import React, { useEffect, useState } from 'react';

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => { fetchJobs(); }, [q]);

  async function fetchJobs() {
    const res = await fetch('http://localhost:3001/jobs');
    const js = await res.json();
    setJobs(js);
  }

  const filtered = jobs.filter(j => !q || (j.title && j.title.toLowerCase().includes(q.toLowerCase())));

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #e0f2ff 0%, #f7faff 100%)",
      padding: "2rem",
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{
          fontSize: "2.8rem",
          fontWeight: "700",
          color: "#1e3a8a",
          marginBottom: "0.5rem",
        }}>
          🚀 Modern Job Portal
        </h1>
        <p style={{ color: "#475569", fontSize: "1.1rem" }}>
          Find your next big opportunity
        </p>
      </div>

      {/* Search Box */}
      <div style={{ maxWidth: "600px", margin: "0 auto 3rem auto" }}>
        <input
          placeholder="🔍 Search by job title..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            width: "100%",
            padding: "1rem 1.2rem",
            borderRadius: "15px",
            border: "2px solid #2563eb",
            fontSize: "1.1rem",
            outline: "none",
            transition: "0.3s",
            boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
            background: "#fff",
          }}
        />
      </div>

      {/* Job Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "2rem",
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        {filtered.map(j => (
          <div
            key={j._id}
            style={{
              padding: "1.8rem",
              borderRadius: "18px",
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
              transition: "all 0.25s ease-in-out",
              cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.5)"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-6px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.12)";
            }}
          >
            <a href={j.apply_url || j.source_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <h2 style={{
                color: "#1d4ed8",
                fontSize: "1.35rem",
                fontWeight: "700",
                marginBottom: "0.6rem",
              }}>
                {j.title}
              </h2>
            </a>

            <div style={{ color: "#475569", marginBottom: "1rem", fontSize: "0.95rem" }}>
              <strong>{j.company || "Unknown Company"}</strong> • {j.location || "N/A"} • {j.experience || "N/A"}
            </div>

            {/* Skills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {j.skills && j.skills.map((s, i) => (
                <span
                  key={i}
                  style={{
                    background: "#dbeafe",
                    color: "#1e40af",
                    padding: "0.3rem 0.65rem",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    border: "1px solid #bfdbfe"
                  }}
                >
                  {s}
                </span>
              ))}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
