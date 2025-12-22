"use client";

import React, { useEffect, useState } from "react";
import { useBlueprint3D } from "../context/Blueprint3DContext";
// @ts-ignore
import { BP3D } from "../lib/blueprint3d";

export default function Floorplanner() {
  const { blueprint3d, appState, setAppState } = useBlueprint3D();
  const [mode, setMode] = useState<number>(0); // 0: MOVE, 1: DRAW, 2: DELETE

  useEffect(() => {
    if (!blueprint3d) return;

    const floorplanner = blueprint3d.floorplanner;

    const handleModeChange = (newMode: number) => {
      setMode(newMode);
    };

    floorplanner.modeResetCallbacks.add(handleModeChange);

    return () => {
      floorplanner.modeResetCallbacks.remove(handleModeChange);
    };
  }, [blueprint3d]);

  useEffect(() => {
    if (appState === "FLOORPLANNER" && blueprint3d) {
      // Timeout to allow DOM to update display: block
      const timer = setTimeout(() => {
        window.requestAnimationFrame(() => {
          blueprint3d.floorplanner.resizeView();
          blueprint3d.floorplanner.reset();
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [appState, blueprint3d]);

  const setFloorplannerMode = (newMode: number) => {
    if (!blueprint3d) return;
    blueprint3d.floorplanner.setMode(newMode);
  };

  const handleDone = () => {
    setAppState("VIEWER");
  };

  // Explicitly set display: 'block' to ensure visibility
  const style: React.CSSProperties =
    appState === "FLOORPLANNER"
      ? { display: "block", height: "100%", position: "relative" }
      : { display: "none" };

  // Constants from BP3D (assuming they match)
  const MODES = {
    MOVE: 0,
    DRAW: 1,
    DELETE: 2,
  };

  return (
    <div id="floorplanner" style={style}>
      <canvas id="floorplanner-canvas"></canvas>
      <div
        id="floorplanner-controls"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          margin: "20px 0",
          padding: "0 20px",
          width: "100%",
        }}
      >
        <button
          id="move"
          className={`btn btn-sm btn-default ${
            mode === MODES.MOVE ? "active btn-primary" : ""
          }`}
          onClick={() => setFloorplannerMode(MODES.MOVE)}
        >
          <span className="glyphicon glyphicon-move"></span> Move Walls
        </button>
        <button
          id="draw"
          className={`btn btn-sm btn-default ${
            mode === MODES.DRAW ? "active btn-primary" : ""
          }`}
          onClick={() => setFloorplannerMode(MODES.DRAW)}
        >
          <span className="glyphicon glyphicon-pencil"></span> Draw Walls
        </button>
        <button
          id="delete"
          className={`btn btn-sm btn-default ${
            mode === MODES.DELETE ? "active btn-primary" : ""
          }`}
          onClick={() => setFloorplannerMode(MODES.DELETE)}
        >
          <span className="glyphicon glyphicon-remove"></span> Delete Walls
        </button>
        <span className="pull-right">
          <button
            className="btn btn-primary btn-sm done_btn"
            id="update-floorplan"
            onClick={handleDone}
          >
            Done &raquo;
          </button>
        </span>
      </div>
      <div
        id="draw-walls-hint"
        style={{
          position: "absolute",
          left: "20px",
          bottom: "20px",
          background: "rgba(0,0,0,.5)",
          color: "#fff",
          padding: "5px 10px",
          display: mode === MODES.DRAW ? "block" : "none",
        }}
      >
        Press the &quot;Esc&quot; key to stop drawing walls
      </div>
    </div>
  );
}
