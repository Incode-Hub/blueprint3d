"use client";

import Script from "next/script";

export default function Home() {
  return (
    <>
      {/* Mobile: hamburger + backdrop for off-canvas sidebar */}
      <button
        id="sidebar-toggle"
        className="btn btn-primary btn-sm visible-xs-inline-block"
        style={{ position: "fixed", top: "10px", left: "10px", zIndex: 2001 }}
      >
        <span className="glyphicon glyphicon-menu-hamburger"></span>
      </button>
      <div id="sidebar-backdrop" className="hidden-xs"></div>

      <div className="container-fluid">
        <div className="row main-row">
          {/* Left Column (responsive / off-canvas on phones) */}
          <div id="sidebar" className="col-xs-12 col-sm-4 col-md-2 sidebar">
            {/* Main Navigation */}
            <ul className="nav nav-sidebar">
              <li id="floorplan_tab" className="active">
                <a href="#">
                  Edit Floorplan{" "}
                  <span className="glyphicon glyphicon-chevron-right pull-right"></span>
                </a>
              </li>
              <li id="design_tab">
                <a href="#">
                  Design{" "}
                  <span className="glyphicon glyphicon-chevron-right pull-right"></span>
                </a>
              </li>
              <li id="items_tab">
                <a href="#">
                  Add Items{" "}
                  <span className="glyphicon glyphicon-chevron-right pull-right"></span>
                </a>
              </li>
            </ul>
            <hr />

            {/* (Optional) PDF Export Section */}
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
                <span className="glyphicon glyphicon-list-alt"></span> Export
                Selected
              </button>
              <button
                className="btn btn-outline-primary btn-sm btn-block"
                id="capture-3d-screenshot"
              >
                <span className="glyphicon glyphicon-camera"></span> Screen
                Capture
              </button>
              <button
                className="btn btn-outline-warning btn-xs btn-block"
                id="clear-selected-items"
                style={{ marginTop: "6px" }}
              >
                <span className="glyphicon glyphicon-refresh"></span> Clear
                Selection
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
            <hr />

            {/* Context Menu */}
            <div id="context-menu" style={{ display: "none" }}>
              <div style={{ margin: "0 20px" }}>
                <span id="context-menu-name" className="lead"></span>
                <br />
                <br />
                <button
                  className="btn btn-block btn-danger"
                  id="context-menu-delete"
                >
                  <span className="glyphicon glyphicon-trash"></span> Delete
                  Item
                </button>
                <br />
                <br />
                <br />
              </div>
            </div>

            {/* Floor textures */}
            <div
              id="floorTexturesDiv"
              style={{ display: "none", padding: "0 20px" }}
            >
              <div className="panel panel-default">
                <div className="panel-heading">Adjust Floor</div>
                <div className="panel-body" style={{ color: "#333" }}>
                  <div className="col-sm-6" style={{ padding: "3px" }}>
                    <a
                      href="#"
                      className="thumbnail texture-select-thumbnail"
                      // @ts-ignore
                      texture-url="rooms/textures/light_fine_wood.jpg"
                      texture-stretch="false"
                      texture-scale="300"
                    >
                      <img
                        alt="Thumb light fine wood"
                        src="rooms/thumbnails/thumbnail_light_fine_wood.jpg"
                      />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Wall textures */}
            <div
              id="wallTextures"
              style={{ display: "none", padding: "0 20px" }}
            >
              <div className="panel panel-default">
                <div className="panel-heading">Adjust Wall</div>
                <div className="panel-body" style={{ color: "#333" }}>
                  <div className="col-sm-6" style={{ padding: "3px" }}>
                    <a
                      href="#"
                      className="thumbnail texture-select-thumbnail"
                      // @ts-ignore
                      texture-url="rooms/textures/marbletiles.jpg"
                      texture-stretch="false"
                      texture-scale="300"
                    >
                      <img
                        alt="Thumb marbletiles"
                        src="rooms/thumbnails/thumbnail_marbletiles.jpg"
                      />
                    </a>
                  </div>
                  <div className="col-sm-6" style={{ padding: "3px" }}>
                    <a
                      href="#"
                      className="thumbnail texture-select-thumbnail"
                      // @ts-ignore
                      texture-url="rooms/textures/wallmap_yellow.png"
                      texture-stretch="true"
                      texture-scale=""
                    >
                      <img
                        alt="Thumb yellow"
                        src="rooms/thumbnails/thumbnail_wallmap_yellow.png"
                      />
                    </a>
                  </div>
                  <div className="col-sm-6" style={{ padding: "3px" }}>
                    <a
                      href="#"
                      className="thumbnail texture-select-thumbnail"
                      // @ts-ignore
                      texture-url="rooms/textures/light_brick.jpg"
                      texture-stretch="false"
                      texture-scale="100"
                    >
                      <img
                        alt="Thumb brick"
                        src="rooms/thumbnails/thumbnail_light_brick.jpg"
                      />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-xs-12 col-sm-8 col-md-9 main">
            {/* 3D Viewer */}
            <div id="viewer">
              {/* Top-left file actions */}
              <div id="main-controls">
                <a href="#" className="btn btn-default btn-sm" id="new">
                  New Plan
                </a>
                <a href="#" className="btn btn-default btn-sm" id="saveFile">
                  Save Plan
                </a>
                <a className="btn btn-sm btn-default btn-file">
                  <input type="file" className="hidden-input" id="loadFile" />{" "}
                  Load Plan
                </a>
              </div>

              {/* Bottom-right camera buttons */}
              <div id="camera-controls">
                <a href="#" className="btn btn-default bottom" id="zoom-out">
                  <span className="glyphicon glyphicon-zoom-out"></span>
                </a>
                <a href="#" className="btn btn-default bottom" id="reset-view">
                  <span className="glyphicon glyphicon-home"></span>
                </a>
                <a href="#" className="btn btn-default bottom" id="zoom-in">
                  <span className="glyphicon glyphicon-zoom-in"></span>
                </a>
                <span>&nbsp;</span>
                <a className="btn btn-default bottom" href="#" id="move-left">
                  <span className="glyphicon glyphicon-arrow-left"></span>
                </a>
                <span className="btn-group-vertical">
                  <a className="btn btn-default" href="#" id="move-up">
                    <span className="glyphicon glyphicon-arrow-up"></span>
                  </a>
                  <a className="btn btn-default" href="#" id="move-down">
                    <span className="glyphicon glyphicon-arrow-down"></span>
                  </a>
                </span>
                <a className="btn btn-default bottom" href="#" id="move-right">
                  <span className="glyphicon glyphicon-arrow-right"></span>
                </a>
              </div>

              {/* Loading overlay */}
              <div id="loading-modal">
                <h1>Loading...</h1>
              </div>

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

            {/* 2D Floorplanner */}
            <div id="floorplanner">
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
                <button id="move" className="btn btn-sm btn-default">
                  <span className="glyphicon glyphicon-move"></span> Move Walls
                </button>
                <button id="draw" className="btn btn-sm btn-default">
                  <span className="glyphicon glyphicon-pencil"></span> Draw
                  Walls
                </button>
                <button id="delete" className="btn btn-sm btn-default">
                  <span className="glyphicon glyphicon-remove"></span> Delete
                  Walls
                </button>
                <span className="pull-right">
                  <button
                    className="btn btn-primary btn-sm done_btn"
                    id="update-floorplan"
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
                  display: "none",
                }}
              >
                Press the &quot;Esc&quot; key to stop drawing walls
              </div>
            </div>

            {/* Add Items */}
            <div id="add-items">
              <div className="row" id="items-wrapper">
                {/* Items added by items.js */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optional PDF Loading Modal */}
      <div
        id="pdf-loading-modal"
        style={{
          display: "none",
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.8)",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div
            className="spinner"
            style={{
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #3498db",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              animation: "spin 2s linear infinite",
              margin: "0 auto 20px",
            }}
          ></div>
          <h3 id="pdf-loading-message">Generating PDF...</h3>
          <p>Please wait while we process your request.</p>
        </div>
      </div>

      {/* Scripts */}
      <Script src="/js/three.min.js" strategy="beforeInteractive" />
      <Script src="/vendor/GLTFLoader.js" strategy="afterInteractive" />
      <Script src="/js/blueprint3d.js" strategy="afterInteractive" />
      <Script src="/js/model-loader.js" strategy="afterInteractive" />
      <Script src="/js/scene-patch.js" strategy="afterInteractive" />
      <Script src="/js/jquery.js" strategy="beforeInteractive" />
      <Script src="/js/bootstrap.js" strategy="afterInteractive" />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        strategy="afterInteractive"
      />
      <Script src="/js/items.js" strategy="afterInteractive" />
      <Script src="/js/pdfexport.js" strategy="afterInteractive" />
      <Script src="/js/example.js" strategy="lazyOnload" />
    </>
  );
}
