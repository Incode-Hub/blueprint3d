"use client";

import React, { useEffect, useState } from "react";
import { useBlueprint3D } from "../context/Blueprint3DContext";

export default function Viewer() {
  const { blueprint3d, loaded, appState } = useBlueprint3D();
  const [itemsLoading, setItemsLoading] = useState(0);

  useEffect(() => {
    if (!blueprint3d) return;

    const onItemLoading = () => setItemsLoading((prev) => prev + 1);
    const onItemLoaded = () => setItemsLoading((prev) => prev - 1);

    blueprint3d.model.scene.itemLoadingCallbacks.add(onItemLoading);
    blueprint3d.model.scene.itemLoadedCallbacks.add(onItemLoaded);

    return () => {
      blueprint3d.model.scene.itemLoadingCallbacks.remove(onItemLoading);
      blueprint3d.model.scene.itemLoadedCallbacks.remove(onItemLoaded);
    };
  }, [blueprint3d]);

  const handleNewPlan = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!blueprint3d) return;
    blueprint3d.model.loadSerialized(
      '{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}'
    );
  };

  const handleSavePlan = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!blueprint3d) return;
    const data = blueprint3d.model.exportSerialized();
    const a = document.createElement("a");
    const blob = new Blob([data], { type: "text/plain" });
    a.href = window.URL.createObjectURL(blob);
    a.download = "design.blueprint3d";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLoadPlan = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!blueprint3d || !e.target.files || !e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        blueprint3d.model.loadSerialized(ev.target.result as string);
      }
    };
    reader.readAsText(e.target.files[0]);
  };

  // Camera Controls
  const panSpeed = 30;
  const directions = { UP: 1, DOWN: 2, LEFT: 3, RIGHT: 4 };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!blueprint3d) return;
    const controls = blueprint3d.three.controls;
    if (controls && controls.dollyIn) {
      controls.dollyIn(1.1);
      controls.update();
    }
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!blueprint3d) return;
    const controls = blueprint3d.three.controls;
    if (controls && controls.dollyOut) {
      controls.dollyOut(1.1);
      controls.update();
    }
  };

  const handleResetView = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!blueprint3d) return;
    blueprint3d.three.centerCamera();
    const controls = blueprint3d.three.controls;
    if (controls && controls.reset) controls.reset();
  };

  const handlePan = (direction: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (!blueprint3d) return;
    const controls = blueprint3d.three.controls;
    if (controls && controls.panXY) {
      if (direction === directions.UP) controls.panXY(0, panSpeed);
      if (direction === directions.DOWN) controls.panXY(0, -panSpeed);
      if (direction === directions.LEFT) controls.panXY(panSpeed, 0);
      if (direction === directions.RIGHT) controls.panXY(-panSpeed, 0);
      controls.update();
    }
  };

  // Explicitly set display: 'block' to ensure visibility overrides any external hiding
  const style: React.CSSProperties =
    appState === "VIEWER"
      ? { display: "block", height: "100%", position: "relative" }
      : { display: "none" };

  return (
    <div id="viewer" style={style}>
      {/* Top-left file actions */}
      <div id="main-controls">
        <a
          href="#"
          className="btn btn-default btn-sm"
          id="new"
          onClick={handleNewPlan}
        >
          New Plan
        </a>
        <a
          href="#"
          className="btn btn-default btn-sm"
          id="saveFile"
          onClick={handleSavePlan}
        >
          Save Plan
        </a>
        <a className="btn btn-sm btn-default btn-file">
          <input
            type="file"
            className="hidden-input"
            id="loadFile"
            onChange={handleLoadPlan}
          />{" "}
          Load Plan
        </a>
      </div>

      {/* Bottom-right camera buttons */}
      <div id="camera-controls">
        <a
          href="#"
          className="btn btn-default bottom"
          id="zoom-out"
          onClick={handleZoomOut}
        >
          <span className="glyphicon glyphicon-zoom-out"></span>
        </a>
        <a
          href="#"
          className="btn btn-default bottom"
          id="reset-view"
          onClick={handleResetView}
        >
          <span className="glyphicon glyphicon-home"></span>
        </a>
        <a
          href="#"
          className="btn btn-default bottom"
          id="zoom-in"
          onClick={handleZoomIn}
        >
          <span className="glyphicon glyphicon-zoom-in"></span>
        </a>
        <span>&nbsp;</span>
        <a
          className="btn btn-default bottom"
          href="#"
          id="move-left"
          onClick={handlePan(directions.LEFT)}
        >
          <span className="glyphicon glyphicon-arrow-left"></span>
        </a>
        <span className="btn-group-vertical">
          <a
            className="btn btn-default"
            href="#"
            id="move-up"
            onClick={handlePan(directions.UP)}
          >
            <span className="glyphicon glyphicon-arrow-up"></span>
          </a>
          <a
            className="btn btn-default"
            href="#"
            id="move-down"
            onClick={handlePan(directions.DOWN)}
          >
            <span className="glyphicon glyphicon-arrow-down"></span>
          </a>
        </span>
        <a
          className="btn btn-default bottom"
          href="#"
          id="move-right"
          onClick={handlePan(directions.RIGHT)}
        >
          <span className="glyphicon glyphicon-arrow-right"></span>
        </a>
      </div>

      {/* Loading overlay */}
      {itemsLoading > 0 && (
        <div id="loading-modal" style={{ display: "block" }}>
          <h1>Loading...</h1>
        </div>
      )}

      {/* === MOBILE ARROWS (inside #viewer) === */}
      <div id="mobile-item-controls" aria-hidden="false">
        <div className="mic-grid">
          <button
            className="mic-btn mic-move"
            data-dx="0"
            data-dz="-1"
            aria-label="Move up"
          >
            ▲
          </button>
          <div className="mic-rot-wrap">
            <button
              className="mic-btn mic-rot"
              data-deg="-5"
              aria-label="Rotate left"
            >
              ⟲
            </button>
            <button
              className="mic-btn mic-rot"
              data-deg="5"
              aria-label="Rotate right"
            >
              ⟳
            </button>
          </div>
          <button
            className="mic-btn mic-move"
            data-dx="0"
            data-dz="1"
            aria-label="Move down"
          >
            ▼
          </button>

          <button
            className="mic-btn mic-move"
            data-dx="-1"
            data-dz="0"
            aria-label="Move left"
          >
            ◀
          </button>
          <button className="mic-btn mic-step" id="mic-step">
            5cm
          </button>
          <button
            className="mic-btn mic-move"
            data-dx="1"
            data-dz="0"
            aria-label="Move right"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
