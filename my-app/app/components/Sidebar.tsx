"use client";

import React from "react";
import PDFExport from "./PDFExport";
import ContextMenu from "./ContextMenu";
import TextureSelector from "./TextureSelector";
import { useBlueprint3D } from "../context/Blueprint3DContext";

export default function Sidebar() {
  const { appState, setAppState } = useBlueprint3D();

  return (
    <div id="sidebar" className="col-xs-12 col-sm-4 col-md-2 sidebar">
      {/* Main Navigation */}
      <ul className="nav nav-sidebar">
        <li
          id="floorplan_tab"
          className={appState === "FLOORPLANNER" ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            setAppState("FLOORPLANNER");
          }}
        >
          <a href="#">
            Edit Floorplan{" "}
            <span className="glyphicon glyphicon-chevron-right pull-right"></span>
          </a>
        </li>
        <li
          id="design_tab"
          className={appState === "VIEWER" ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            setAppState("VIEWER");
          }}
        >
          <a href="#">
            Design{" "}
            <span className="glyphicon glyphicon-chevron-right pull-right"></span>
          </a>
        </li>
        <li
          id="items_tab"
          className={appState === "ADD_ITEMS" ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            setAppState("ADD_ITEMS");
          }}
        >
          <a href="#">
            Add Items{" "}
            <span className="glyphicon glyphicon-chevron-right pull-right"></span>
          </a>
        </li>
      </ul>
      <hr />

      <PDFExport />
      <hr />

      <ContextMenu />
      <TextureSelector />
    </div>
  );
}
