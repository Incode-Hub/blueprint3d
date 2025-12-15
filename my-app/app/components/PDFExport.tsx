"use client";

import React from "react";

export default function PDFExport() {
  return (
    <div id="pdf-export-section" style={{ marginBottom: "20px" }}>
      <h5
        className="text-center"
        style={{ marginBottom: "15px", color: "#666" }}
      >
        <span className="glyphicon glyphicon-print"></span> Export PDF
      </h5>
      <button
        className="btn btn-outline-primary btn-sm btn-block"
        id="export-selected-layout"
      >
        <span className="glyphicon glyphicon-list-alt"></span> Export Selected
      </button>
      <button
        className="btn btn-outline-primary btn-sm btn-block"
        id="capture-3d-screenshot"
      >
        <span className="glyphicon glyphicon-camera"></span> Screen Capture
      </button>
      <button
        className="btn btn-outline-warning btn-xs btn-block"
        id="clear-selected-items"
        style={{ marginTop: "6px" }}
      >
        <span className="glyphicon glyphicon-refresh"></span> Clear Selection
      </button>
      <div
        className="text-muted"
        style={{ marginTop: "6px", fontSize: "11px" }}
      >
        Selected items: <span id="selected-items-count">0</span>
      </div>
      <div
        id="pdf-status"
        className="alert"
        style={{
          display: "none",
          marginTop: "10px",
          padding: "8px",
          fontSize: "11px",
        }}
      ></div>
    </div>
  );
}
