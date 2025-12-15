"use client";

import React from "react";

export default function ContextMenu() {
  return (
    <div id="context-menu" style={{ display: "none" }}>
      <div style={{ margin: "0 20px" }}>
        <span id="context-menu-name" className="lead"></span>
        <br />
        <br />
        <button className="btn btn-block btn-danger" id="context-menu-delete">
          <span className="glyphicon glyphicon-trash"></span> Delete Item
        </button>
        <br />
        <br />
        <br />
      </div>
    </div>
  );
}
