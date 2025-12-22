"use client";

import React from "react";
import { useBlueprint3D } from "../context/Blueprint3DContext";

export default function ContextMenu() {
  const { blueprint3d, appState } = useBlueprint3D();
  const [visible, setVisible] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [fixed, setFixed] = React.useState(false);

  React.useEffect(() => {
    if (!blueprint3d) return;

    const handleItemSelected = (item: any) => {
      setSelectedItem(item);
      setFixed(item.fixed);
      setVisible(true);
    };

    const handleItemUnselected = () => {
      setSelectedItem(null);
      setVisible(false);
    };

    const handleNothingClicked = () => {
      setSelectedItem(null);
      setVisible(false);
    };

    blueprint3d.three.itemSelectedCallbacks.add(handleItemSelected);
    blueprint3d.three.itemUnselectedCallbacks.add(handleItemUnselected);
    blueprint3d.three.nothingClicked.add(handleNothingClicked);

    return () => {
      blueprint3d.three.itemSelectedCallbacks.remove(handleItemSelected);
      blueprint3d.three.itemUnselectedCallbacks.remove(handleItemUnselected);
      blueprint3d.three.nothingClicked.remove(handleNothingClicked);
    };
  }, [blueprint3d]);

  const handleDelete = () => {
    if (selectedItem) {
      selectedItem.remove();
      setSelectedItem(null);
      setVisible(false);
    }
  };

  const handleFixedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedItem) {
      const isFixed = e.target.checked;
      selectedItem.setFixed(isFixed);
      setFixed(isFixed);
    }
  };

  if (!visible) return null;

  return (
    <div
      id="context-menu"
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "300px",
        background: "rgba(255, 255, 255, 0.95)",
        borderLeft: "1px solid #ccc",
        padding: "20px",
        zIndex: 1000,
        overflowY: "auto",
        display: appState === "VIEWER" ? "block" : "none", // Only show in Viewer
      }}
    >
      <div style={{ margin: "0 20px" }}>
        <span id="context-menu-name" className="lead">
          {selectedItem?.metadata?.itemName}
        </span>
        <br />
        <br />
        <button
          className="btn btn-block btn-danger"
          id="context-menu-delete"
          onClick={handleDelete}
        >
          <span className="glyphicon glyphicon-trash"></span> Delete Item
        </button>
        <br />
        <br />
        <div className="checkbox" style={{ marginLeft: "20px" }}>
          <label>
            <input
              type="checkbox"
              checked={fixed}
              onChange={handleFixedChange}
            />{" "}
            Lock in place
          </label>
        </div>
        <br />
      </div>
    </div>
  );
}
