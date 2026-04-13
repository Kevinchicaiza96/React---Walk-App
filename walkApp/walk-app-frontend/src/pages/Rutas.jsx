import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import api from "../axiosConfig";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Rutas.css";

const ORS_API_KEY = process.env.REACT_APP_ORS_API_KEY;

const DIFICULTAD_COLORS = {
  FACIL:    { bg: "#e8f5e9", text: "#2d5a27", border: "#a5d6a7", dot: "#4caf50" },
  MODERADO: { bg: "#fff8e1", text: "#e65100", border: "#ffcc80", dot: "#ff9800" },
  DIFICIL:  { bg: "#fce4ec", text: "#b71c1c", border: "#f48fb1", dot: "#f44336" },
  EXTREMO:  { bg: "#f3e5f5", text: "#4a148c", border: "#ce93d8", dot: "#9c27b0" },
};
const DIFICULTAD_LABELS = { FACIL: "Fácil", MODERADO: "Moderado", DIFICIL: "Difícil", EXTREMO: "Extremo" };
const RUTA_GRADIENTS = [
  "linear-gradient(135deg,#1e3d1a,#4a7c59)",
  "linear-gradient(135deg,#2d5a27,#b5d5a0)",
  "linear-gradient(135deg,#0d1f0d,#3a6b4a)",
  "linear-gradient(135deg,#1a3a1a,#6a9b6a)",
  "linear-gradient(135deg,#2a4a2a,#5a8a5a)",
  "linear-gradient(135deg,#0a2a0a,#4a7c59)",
];
const DIFICULTADES_OPT = [
  { value: "FACIL",    label: "Fácil",    color: "#4caf50", emoji: "🟢" },
  { value: "MODERADO", label: "Moderado", color: "#ff9800", emoji: "🟡" },
  { value: "DIFICIL",  label: "Difícil",  color: "#f44336", emoji: "🔴" },
  { value: "EXTREMO",  label: "Extremo",  color: "#9c27b0", emoji: "🟣" },
];

async function calcularRutaORS(waypoints) {
  if (waypoints.length < 2) return null;

  const coordinates = waypoints.map(([lat, lng]) => [lng, lat]);
  try {
    const res = await fetch("https://api.openrouteservice.org/v2/directions/foot-hiking/geojson", {
      method: "POST",
      headers: {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates }),
    });
    if (!res.ok) throw new Error(`ORS error ${res.status}`);
    const data = await res.json();

    const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const distanceM = data.features[0].properties.summary.distance;
    const durationS = data.features[0].properties.summary.duration;
    return { coords, distanceKm: (distanceM / 1000).toFixed(2), durationMin: Math.round(durationS / 60) };
  } catch (err) {
    console.error("Error ORS:", err);
    return null;
  }
}

function MapaDibujo({ coordenadas, onChange, onRutaInfo }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const straightLineRef = useRef(null);
  const [calculando, setCalculando] = useState(false);
  const [orsInfo, setOrsInfo] = useState(null);
  const [orsError, setOrsError] = useState(false);

  const waypointsRef = useRef([]);

  const dibujarRuta = useCallback(async (waypoints, map) => {
    const L = window.L;
    if (!map || waypoints.length < 2) return;
    setCalculando(true);
    setOrsError(false);

    if (straightLineRef.current) map.removeLayer(straightLineRef.current);
    straightLineRef.current = L.polyline(waypoints, {
      color: "#4a7c59", weight: 2, opacity: 0.5, dashArray: "6 6",
    }).addTo(map);

    const resultado = await calcularRutaORS(waypoints);
    setCalculando(false);

    if (straightLineRef.current) { map.removeLayer(straightLineRef.current); straightLineRef.current = null; }

    if (resultado) {
      if (polylineRef.current) map.removeLayer(polylineRef.current);
      polylineRef.current = L.polyline(resultado.coords, {
        color: "#2d5a27", weight: 4, opacity: 0.9,
      }).addTo(map);
      setOrsInfo(resultado);
      if (onRutaInfo) onRutaInfo(resultado);
      onChange(waypoints);
    } else {
      setOrsError(true);
      if (polylineRef.current) map.removeLayer(polylineRef.current);
      polylineRef.current = L.polyline(waypoints, { color: "#f44336", weight: 3, opacity: 0.75, dashArray: "8 4" }).addTo(map);
      onChange(waypoints);
    }
  }, [onChange, onRutaInfo]);

  useEffect(() => {
    if (mapInstance.current) return;
    const linkCSS = document.createElement("link");
    linkCSS.rel = "stylesheet";
    linkCSS.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(linkCSS);

    const inicializar = () => {
      const L = window.L;
      if (!mapRef.current || mapInstance.current) return;
      const map = L.map(mapRef.current, { center: [2.4448, -76.6147], zoom: 14, scrollWheelZoom: true });
      mapInstance.current = map;
      waypointsRef.current = [];

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 19,
      }).addTo(map);

      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;
        const nuevos = [...waypointsRef.current, [lat, lng]];
        waypointsRef.current = nuevos;
        const idx = nuevos.length - 1;

        const color = idx === 0 ? "#2d5a27" : "#4a7c59";
        const marker = L.circleMarker([lat, lng], {
          radius: idx === 0 ? 10 : 7, fillColor: color, color: "#fff", weight: 2, fillOpacity: 1,
        }).addTo(map);
        marker.bindTooltip(idx === 0 ? "🚀 Inicio" : `Punto ${idx + 1}`, { permanent: false });
        markersRef.current.push(marker);

        if (nuevos.length >= 2) {
          await dibujarRuta(nuevos, map);
        } else {
          onChange(nuevos);
        }
      });
    };

    if (window.L) { inicializar(); }
    else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = inicializar;
      document.body.appendChild(script);
    }

    return () => {
      waypointsRef.current = [];
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [dibujarRuta, onChange]);

  const handleDeshacer = async () => {
    const map = mapInstance.current;
    if (!map || !markersRef.current.length) return;
    map.removeLayer(markersRef.current.pop());
    const nuevos = waypointsRef.current.slice(0, -1);
    waypointsRef.current = nuevos;

    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    if (straightLineRef.current) { map.removeLayer(straightLineRef.current); straightLineRef.current = null; }
    setOrsInfo(null); setOrsError(false);

    if (nuevos.length >= 2) {
      await dibujarRuta(nuevos, map);
    } else {
      onChange(nuevos);
    }
  };

  const handleLimpiar = () => {
    const map = mapInstance.current; if (!map) return;
    markersRef.current.forEach(m => map.removeLayer(m)); markersRef.current = [];
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    if (straightLineRef.current) { map.removeLayer(straightLineRef.current); straightLineRef.current = null; }
    waypointsRef.current = [];
    setOrsInfo(null); setOrsError(false);
    onChange([]);
  };

  const nPuntos = coordenadas.length;

  return (
    <div>
      <div ref={mapRef} className="mapa-dibujo__map" />
      {calculando && (
        <div className="mapa-ors-status mapa-ors-status--calculando">
          ⏳ Calculando ruta real con OpenRouteService…
        </div>
      )}
      {orsError && (
        <div className="mapa-ors-status mapa-ors-status--error">
          ⚠️ No se pudo calcular la ruta real. Se muestra trayecto directo.
        </div>
      )}
      {orsInfo && !calculando && (
        <div className="mapa-ors-info">
          <span>🗺️ Distancia real: <strong>{orsInfo.distanceKm} km</strong></span>
          <span>⏱ Tiempo estimado (senderismo): <strong>{orsInfo.durationMin} min</strong></span>
        </div>
      )}
      <div className="mapa-dibujo__controls">
        <span className="mapa-dibujo__hint">
          {nPuntos === 0 && "Haz clic en el mapa para trazar el recorrido"}
          {nPuntos === 1 && "1 punto marcado — agrega otro para calcular la ruta"}
          {nPuntos > 1 && `${nPuntos} waypoints · ruta calculada por ORS`}
        </span>
        <div className="mapa-dibujo__btns">
          <button type="button" onClick={handleDeshacer} disabled={nPuntos === 0 || calculando} className="mapa-dibujo__btn mapa-dibujo__btn--undo">↩ Deshacer</button>
          <button type="button" onClick={handleLimpiar} disabled={nPuntos === 0 || calculando} className="mapa-dibujo__btn mapa-dibujo__btn--clear">🗑 Limpiar</button>
        </div>
      </div>
    </div>
  );
}

function ModalCrearRuta({ onClose, onCreada }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    nombre_ruta: "", descripcion: "", longitud: "", dificultad: "MODERADO",
    duracion_estimada: "", ubicacion: "", ubicacion_inicio: "", ubicacion_fin: "", puntos_interes: "",
  });
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);
  const [coordenadas, setCoordenadas] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});
  const [exito, setExito] = useState(false);

  const handleRutaInfo = useCallback((info) => {
    setForm(prev => ({
      ...prev,
      longitud: prev.longitud || info.distanceKm,
      duracion_estimada: prev.duracion_estimada || `${info.durationMin} min`,
    }));
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errores[name]) setErrores(p => ({ ...p, [name]: null }));
  };

  const handleImagen = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImagen(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const validar = () => {
    const e = {};
    if (!form.nombre_ruta.trim()) e.nombre_ruta = "El nombre es obligatorio";
    if (!form.longitud || isNaN(form.longitud) || Number(form.longitud) <= 0) e.longitud = "Longitud válida en km";
    if (!form.descripcion.trim()) e.descripcion = "La descripción es obligatoria";
    if (!form.ubicacion.trim()) e.ubicacion = "La ubicación es obligatoria";
    return e;
  };

  const handleSubmit = async () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    setEnviando(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v); });
      if (imagen) data.append("imagen", imagen);
      if (coordenadas.length > 1) data.append("coordenadas_ruta", JSON.stringify(coordenadas));
      const res = await api.post("/api/rutas/crear/", data, { headers: { "Content-Type": "multipart/form-data" } });
      setExito(true);
      setTimeout(() => { onCreada(res.data.ruta); onClose(); }, 1600);
    } catch (err) {
      if (err.response?.data?.errores) setErrores(err.response.data.errores);
      else setErrores({ general: "Error al crear la ruta. Intenta de nuevo." });
    } finally { setEnviando(false); }
  };

  const inputClass = (campo) => `modal-input ${errores[campo] ? "modal-input--error" : "modal-input--normal"}`;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-header__left">
            <div className="modal-header__icon">🏔️</div>
            <div>
              <h2 className="modal-header__title">Crear Nueva Ruta</h2>
              <p className="modal-header__subtitle">Comparte un sendero con la comunidad</p>
            </div>
          </div>
          <button className="modal-header__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {exito && (
            <div className="modal-exito">
              <div className="modal-exito__icon">✅</div>
              <div className="modal-exito__text">¡Ruta creada exitosamente!</div>
            </div>
          )}
          {errores.general && <div className="modal-error-general">❌ {errores.general}</div>}

          <div className="modal-section">
            <h4 className="modal-section__title">📋 Información Básica</h4>
            <div style={{ display: "grid", gap: 14 }}>
              <div className="modal-field">
                <label className="modal-label">Nombre de la Ruta *</label>
                <input name="nombre_ruta" value={form.nombre_ruta} onChange={handleChange} placeholder="Ej: Sendero Coconuco - San Nicolás" className={inputClass("nombre_ruta")} />
                {errores.nombre_ruta && <div className="modal-field-error">{errores.nombre_ruta}</div>}
              </div>
              <div className="modal-field">
                <label className="modal-label">Descripción *</label>
                <textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Describe el recorrido, paisajes, puntos destacados..." rows={3} className={inputClass("descripcion")} style={{ resize: "vertical" }} />
                {errores.descripcion && <div className="modal-field-error">{errores.descripcion}</div>}
              </div>
              <div className="modal-grid-2">
                <div className="modal-field">
                  <label className="modal-label">Longitud (km) *</label>
                  <input name="longitud" type="number" step="0.1" min="0" value={form.longitud} onChange={handleChange} placeholder="Ej: 12.5 (se llena solo con ORS)" className={inputClass("longitud")} />
                  {errores.longitud && <div className="modal-field-error">{errores.longitud}</div>}
                </div>
                <div className="modal-field">
                  <label className="modal-label">Duración Estimada</label>
                  <input name="duracion_estimada" value={form.duracion_estimada} onChange={handleChange} placeholder="Se llena auto al trazar" className="modal-input modal-input--normal" />
                </div>
              </div>
              <div className="modal-field">
                <label className="modal-label">Dificultad *</label>
                <div className="modal-dificultad-grid">
                  {DIFICULTADES_OPT.map(d => (
                    <button key={d.value} type="button" onClick={() => setForm(p => ({ ...p, dificultad: d.value }))}
                      className="modal-dificultad-btn"
                      style={{ background: form.dificultad === d.value ? `${d.color}22` : "rgba(255,255,255,0.04)", outline: `1px solid ${form.dificultad === d.value ? d.color : "rgba(255,255,255,0.1)"}` }}>
                      <div className="modal-dificultad-btn__emoji">{d.emoji}</div>
                      <div className="modal-dificultad-btn__label" style={{ fontWeight: form.dificultad === d.value ? 700 : 400, color: form.dificultad === d.value ? d.color : "rgba(247,245,240,0.5)" }}>{d.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h4 className="modal-section__title">📍 Ubicaciones</h4>
            <div style={{ display: "grid", gap: 12 }}>
              <div className="modal-field">
                <label className="modal-label">Ubicación General *</label>
                <input name="ubicacion" value={form.ubicacion} onChange={handleChange} placeholder="Ej: Popayán, Cauca" className={inputClass("ubicacion")} />
                {errores.ubicacion && <div className="modal-field-error">{errores.ubicacion}</div>}
              </div>
              <div className="modal-grid-2">
                <div className="modal-field">
                  <label className="modal-label">Punto de Inicio</label>
                  <input name="ubicacion_inicio" value={form.ubicacion_inicio} onChange={handleChange} placeholder="Ej: Parque Natural Puracé" className="modal-input modal-input--normal" />
                </div>
                <div className="modal-field">
                  <label className="modal-label">Punto de Llegada</label>
                  <input name="ubicacion_fin" value={form.ubicacion_fin} onChange={handleChange} placeholder="Ej: Cráter del Volcán" className="modal-input modal-input--normal" />
                </div>
              </div>
              <div className="modal-field">
                <label className="modal-label">Puntos de Interés</label>
                <textarea name="puntos_interes" value={form.puntos_interes} onChange={handleChange} placeholder="Cascadas, miradores, fauna, flora destacada..." rows={2} className="modal-input modal-input--normal" style={{ resize: "vertical" }} />
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h4 className="modal-section__title">🖼️ Imagen</h4>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImagen} style={{ display: "none" }} />
            {preview ? (
              <div className="modal-upload-preview">
                <img src={preview} alt="preview" className="modal-upload-preview__img" />
                <button className="modal-upload-preview__remove" onClick={() => { setImagen(null); setPreview(null); fileRef.current.value = ""; }}>✕</button>
              </div>
            ) : (
              <div className="modal-upload-zone" onClick={() => fileRef.current.click()}>
                <div className="modal-upload-zone__icon">📸</div>
                <div className="modal-upload-zone__text">Haz clic para subir una imagen</div>
                <div className="modal-upload-zone__hint">JPG, PNG, WEBP · Máx 5MB</div>
              </div>
            )}
          </div>

          <div className="modal-section modal-section--last">
            <h4 className="modal-section__title">🗺️ Trazado de la Ruta</h4>
            <p className="modal-section__hint">
              Haz clic en el mapa para añadir waypoints. Con 2+ puntos, <strong>OpenRouteService</strong> calculará la ruta real por senderos y rellenará automáticamente la distancia y duración.
            </p>
            <MapaDibujo coordenadas={coordenadas} onChange={setCoordenadas} onRutaInfo={handleRutaInfo} />
            {coordenadas.length > 1 && <div className="modal-trazado-ok">✅ Trazado con {coordenadas.length} waypoints guardado</div>}
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-footer__cancel" onClick={onClose}>Cancelar</button>
          <button onClick={handleSubmit} disabled={enviando} className={`modal-footer__submit ${enviando ? "modal-footer__submit--loading" : "modal-footer__submit--active"}`}>
            {enviando ? "⏳ Creando..." : "✅ Crear Ruta"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-thumb" />
      <div className="skeleton-body">
        <div className="skeleton-line" style={{ height: 20, width: "70%" }} />
        <div className="skeleton-line" style={{ height: 14, width: "100%" }} />
        <div className="skeleton-line" style={{ height: 14, width: "60%", marginBottom: 20 }} />
        <div className="skeleton-footer">
          <div className="skeleton-footer__left" style={{ height: 16, width: "30%" }} />
          <div className="skeleton-footer__right" style={{ height: 32, width: "40%" }} />
        </div>
      </div>
    </div>
  );
}

function RutaCardGrid({ ruta, index, favoritos, onToggleFavorito, user }) {
  const [hovered, setHovered] = useState(false);
  const isFav = favoritos.includes(ruta.id);
  const diff = DIFICULTAD_COLORS[ruta.dificultad] || DIFICULTAD_COLORS.MODERADO;
  return (
    <a href={`/rutas/${ruta.id}/`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="ruta-card-grid"
      style={{ boxShadow: hovered ? "0 24px 60px rgba(26,46,26,0.18)" : "0 4px 20px rgba(26,46,26,0.07)", transform: hovered ? "translateY(-8px)" : "none", textDecoration: "none" }}>
      <div className="ruta-card-grid__thumb" style={{ background: ruta.imagen_url ? "transparent" : RUTA_GRADIENTS[index % RUTA_GRADIENTS.length] }}>
        {ruta.imagen_url
          ? <img src={ruta.imagen_url} alt={ruta.nombre_ruta} className="ruta-card-grid__img" style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }} />
          : <span className="ruta-card-grid__placeholder">🏔️</span>
        }
        <div className="ruta-card-grid__overlay" />
        <div className="ruta-card-grid__badge-wrap">
          <span className="ruta-card-grid__badge" style={{ background: diff.bg, color: diff.text, border: `1px solid ${diff.border}` }}>
            <span className="ruta-card-grid__badge-dot" style={{ background: diff.dot }} />
            {DIFICULTAD_LABELS[ruta.dificultad] || ruta.dificultad}
          </span>
        </div>
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorito(ruta.id); }}
          className={`ruta-card-grid__fav-btn ${isFav ? "ruta-card-grid__fav-btn--on" : "ruta-card-grid__fav-btn--off"}`}
          style={{ cursor: user ? "pointer" : "not-allowed" }}>
          {isFav ? "❤️" : "🤍"}
        </button>
        <div className="ruta-card-grid__views">👁 {ruta.vistas || 0} vistas</div>
      </div>
      <div className="ruta-card-grid__body">
        <h3 className="ruta-card-grid__name">{ruta.nombre_ruta}</h3>

        {/* ✅ Sin truncado — texto completo */}
        <p className="ruta-card-grid__desc">{ruta.descripcion || "Sin descripción disponible."}</p>

        <div className="ruta-card-grid__meta">
          <div className="ruta-card-grid__meta-item">
            <span>📏</span>
            <span className="ruta-card-grid__meta-km">{ruta.longitud} km</span>
          </div>
          {ruta.duracion_estimada && (
            <div className="ruta-card-grid__meta-item">
              <span>⏱</span>
              <span className="ruta-card-grid__meta-dur">{ruta.duracion_estimada}</span>
            </div>
          )}
          {ruta.ubicacion && (
            <div className="ruta-card-grid__meta-item">
              <span>📍</span>
              {/* ✅ Sin truncado — el CSS maneja el overflow con text-overflow: ellipsis en max-width */}
              <span className="ruta-card-grid__meta-loc">{ruta.ubicacion}</span>
            </div>
          )}
        </div>

        <div className="ruta-card-grid__btn" style={{ background: hovered ? "#1e3d1a" : "#2d5a27" }}>
          Ver Ruta →
        </div>
      </div>
    </a>
  );
}

function RutaCardList({ ruta, index, favoritos, onToggleFavorito, user }) {
  const [hovered, setHovered] = useState(false);
  const isFav = favoritos.includes(ruta.id);
  const diff = DIFICULTAD_COLORS[ruta.dificultad] || DIFICULTAD_COLORS.MODERADO;
  return (
    <a href={`/rutas/${ruta.id}/`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="ruta-card-list"
      style={{ boxShadow: hovered ? "0 12px 40px rgba(26,46,26,0.14)" : "0 2px 12px rgba(26,46,26,0.06)", transform: hovered ? "translateX(6px)" : "none", textDecoration: "none", display: "grid", gridTemplateColumns: "200px 1fr" }}>
      <div className="ruta-card-list__thumb" style={{ background: ruta.imagen_url ? "transparent" : RUTA_GRADIENTS[index % RUTA_GRADIENTS.length] }}>
        {ruta.imagen_url
          ? <img src={ruta.imagen_url} alt={ruta.nombre_ruta} className="ruta-card-list__img" style={{ transform: hovered ? "scale(1.08)" : "scale(1)" }} />
          : <span className="ruta-card-list__placeholder">🏔️</span>
        }
      </div>
      <div className="ruta-card-list__body">
        <div>
          <div className="ruta-card-list__header">
            <h3 className="ruta-card-list__name">{ruta.nombre_ruta}</h3>
            <div className="ruta-card-list__header-right">
              <span className="ruta-card-list__badge" style={{ background: diff.bg, color: diff.text, border: `1px solid ${diff.border}` }}>
                <span className="ruta-card-list__badge-dot" style={{ background: diff.dot }} />
                {DIFICULTAD_LABELS[ruta.dificultad] || ruta.dificultad}
              </span>
              <button onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorito(ruta.id); }}
                className="ruta-card-list__fav-btn"
                style={{ transform: isFav ? "scale(1.2)" : "scale(1)" }}>
                {isFav ? "❤️" : "🤍"}
              </button>
            </div>
          </div>

          {/* ✅ Sin truncado — texto completo */}
          <p className="ruta-card-list__desc">{ruta.descripcion || "Sin descripción."}</p>
        </div>

        <div className="ruta-card-list__footer">
          <div className="ruta-card-list__meta">
            <span className="ruta-card-list__meta-km">📏 {ruta.longitud} km</span>
            {ruta.duracion_estimada && <span className="ruta-card-list__meta-dur">⏱ {ruta.duracion_estimada}</span>}
            <span className="ruta-card-list__meta-views">👁 {ruta.vistas || 0}</span>
          </div>
          <div className="ruta-card-list__btn" style={{ background: hovered ? "#1e3d1a" : "#2d5a27" }}>
            Ver Ruta →
          </div>
        </div>
      </div>
    </a>
  );
}

export default function Rutas() {
  const [rutas, setRutas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState({ dificultad: "", buscar: "", orden: "" });
  const [vista, setVista] = useState("grid");
  const [favoritos, setFavoritos] = useState([]);
  const [user, setUser] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [totalRutas, setTotalRutas] = useState(0);
  const [modalAbierta, setModalAbierta] = useState(false);
  const location = useLocation();
  const RUTAS_POR_PAGINA = 9;
  const headerRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("crear") === "true" && user) { setModalAbierta(true); window.history.replaceState({}, "", "/rutas"); }
  }, [location.search, user]);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      try {
        const parsed = JSON.parse(u); setUser(parsed);
        const favs = localStorage.getItem(`favoritos_${parsed.id}`);
        if (favs) try { setFavoritos(JSON.parse(favs)); } catch {}
      } catch {}
    }
  }, []);

  const fetchRutas = useCallback(async () => {
    try {
      setCargando(true); setError(null);
      const params = {};
      if (filtro.dificultad) params.dificultad = filtro.dificultad;
      if (filtro.buscar)     params.buscar     = filtro.buscar;
      const res = await api.get("/api/rutas/", { params });
      let data = res.data?.rutas || res.data;
      if (filtro.orden === "distancia_asc")  data = [...data].sort((a, b) => a.longitud - b.longitud);
      if (filtro.orden === "distancia_desc") data = [...data].sort((a, b) => b.longitud - a.longitud);
      if (filtro.orden === "dificultad") { const order = { FACIL:1,MODERADO:2,DIFICIL:3,EXTREMO:4 }; data = [...data].sort((a,b) => (order[a.dificultad]||2)-(order[b.dificultad]||2)); }
      if (filtro.orden === "vistas") data = [...data].sort((a, b) => (b.vistas||0) - (a.vistas||0));
      setTotalRutas(data.length); setRutas(data); setPagina(1);
    } catch { setError("No se pudieron cargar las rutas."); }
    finally { setCargando(false); }
  }, [filtro]);

  useEffect(() => { fetchRutas(); }, [fetchRutas]);

  const handleRutaCreada = useCallback((nuevaRuta) => {
    if (nuevaRuta) { setRutas(prev => [nuevaRuta, ...prev]); setTotalRutas(prev => prev + 1); }
    else fetchRutas();
  }, [fetchRutas]);

  const handleToggleFavorito = useCallback(async (rutaId) => {
    if (!user) { window.location.href = "/login"; return; }
    try {
      const res = await api.post(`/api/rutas/${rutaId}/favorita/`);
      const esFavorita = res.data.favorita;
      setFavoritos(prev => { const next = esFavorita ? [...prev, rutaId] : prev.filter(id => id !== rutaId); localStorage.setItem(`favoritos_${user.id}`, JSON.stringify(next)); return next; });
    } catch {
      setFavoritos(prev => { const next = prev.includes(rutaId) ? prev.filter(id => id !== rutaId) : [...prev, rutaId]; localStorage.setItem(`favoritos_${user.id}`, JSON.stringify(next)); return next; });
    }
  }, [user]);

  const rutasPaginadas = rutas.slice((pagina - 1) * RUTAS_POR_PAGINA, pagina * RUTAS_POR_PAGINA);
  const totalPaginas   = Math.ceil(totalRutas / RUTAS_POR_PAGINA);
  const conteosDificultad = ["FACIL","MODERADO","DIFICIL","EXTREMO"].reduce((acc, d) => { acc[d] = rutas.filter(r => r.dificultad === d).length; return acc; }, {});

  return (
    <div className="rutas-page">
      <Navbar />
      {modalAbierta && <ModalCrearRuta onClose={() => setModalAbierta(false)} onCreada={handleRutaCreada} />}

      <div className="rutas-hero" ref={headerRef}>
        <div className="rutas-hero__orb rutas-hero__orb--1" />
        <div className="rutas-hero__orb rutas-hero__orb--2" />
        <div className="rutas-hero__orb rutas-hero__orb--3" />
        <div className="rutas-hero__orb rutas-hero__orb--4" />
        <div className="rutas-hero__inner">
          <div className="rutas-hero__eyebrow">Popayán · Colombia</div>
          <h1 className="rutas-hero__title">Explora Todos los <em>Senderos</em></h1>
          <p className="rutas-hero__subtitle">Descubre rutas únicas en los alrededores de Popayán, desde caminatas fáciles hasta senderos extremos.</p>
          <div className="rutas-hero__stats">
            {[
              { num: totalRutas,                                              label: "Rutas totales",   icon: "🗺️" },
              { num: conteosDificultad.FACIL    || 0,                        label: "Rutas fáciles",   icon: "🟢" },
              { num: conteosDificultad.MODERADO || 0,                        label: "Moderadas",       icon: "🟡" },
              { num: (conteosDificultad.DIFICIL || 0) + (conteosDificultad.EXTREMO || 0), label: "Difíciles", icon: "🔴" },
              { num: conteosDificultad.EXTREMO  || 0,                        label: "Extremas",        icon: "🟣" },
              { num: favoritos.length,                                        label: "Mis favoritas",   icon: "❤️" },
            ].map(s => (
              <div key={s.label} className="rutas-hero__stat">
                <span className="rutas-hero__stat-icon">{s.icon}</span>
                <div>
                  <div className="rutas-hero__stat-num">{s.num}</div>
                  <div className="rutas-hero__stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
          {user && <button onClick={() => setModalAbierta(true)} className="btn-crear-ruta">+ Crear Nueva Ruta</button>}
        </div>
      </div>

      <div className="rutas-content">
        <div className="rutas-filters">
          <div className="rutas-filters__row">
            <div className="rutas-filters__search-wrapper">
              <span className="rutas-filters__search-icon">🔍</span>
              <input value={filtro.buscar} onChange={e => setFiltro(f => ({ ...f, buscar: e.target.value }))} placeholder="Buscar por nombre de ruta..." className="rutas-filters__search" />
            </div>
            <select value={filtro.orden} onChange={e => setFiltro(f => ({ ...f, orden: e.target.value }))} className="rutas-filters__select">
              <option value="">Ordenar por...</option>
              <option value="distancia_asc">Distancia: menor a mayor</option>
              <option value="distancia_desc">Distancia: mayor a menor</option>
              <option value="dificultad">Dificultad</option>
              <option value="vistas">Más visitadas</option>
            </select>
            <div className="rutas-filters__vista">
              {[{ key: "grid", icon: "⊞" }, { key: "list", icon: "☰" }].map(v => (
                <button key={v.key} onClick={() => setVista(v.key)} className={`rutas-filters__vista-btn ${vista === v.key ? "rutas-filters__vista-btn--active" : "rutas-filters__vista-btn--inactive"}`}>{v.icon}</button>
              ))}
            </div>
          </div>
          <div className="rutas-filters__chips">
            <span className="rutas-filters__chips-label">Dificultad:</span>
            {[
              { value: "",         label: "Todas" },
              { value: "FACIL",    label: "🟢 Fácil" },
              { value: "MODERADO", label: "🟡 Moderado" },
              { value: "DIFICIL",  label: "🔴 Difícil" },
              { value: "EXTREMO",  label: "🟣 Extremo" },
            ].map(chip => (
              <button key={chip.value} onClick={() => setFiltro(f => ({ ...f, dificultad: chip.value }))} className={`filter-chip ${filtro.dificultad === chip.value ? "active" : ""}`}>
                {chip.label}
                {chip.value && (
                  <span className={`filter-chip__count ${filtro.dificultad === chip.value ? "filter-chip__count--active" : "filter-chip__count--inactive"}`}>
                    {conteosDificultad[chip.value]}
                  </span>
                )}
              </button>
            ))}
            {(filtro.buscar || filtro.dificultad || filtro.orden) && (
              <button onClick={() => setFiltro({ dificultad: "", buscar: "", orden: "" })} className="rutas-filters__clear">✕ Limpiar filtros</button>
            )}
          </div>
        </div>

        {!cargando && !error && (
          <div className="rutas-count">
            <p className="rutas-count__text">
              Mostrando <strong>{rutasPaginadas.length}</strong> de <strong>{totalRutas}</strong> rutas
              {filtro.buscar && <> para "<em>{filtro.buscar}</em>"</>}
            </p>
            {totalPaginas > 1 && <p className="rutas-count__pages">Página {pagina} de {totalPaginas}</p>}
          </div>
        )}

        {cargando && (
          <div className={vista === "grid" ? "rutas-grid" : "rutas-list"}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div className="rutas-error">
            <div className="rutas-error__icon">⚠️</div>
            <h3 className="rutas-error__title">Error al cargar las rutas</h3>
            <p className="rutas-error__text">{error}</p>
            <button onClick={() => setFiltro({ ...filtro })} className="rutas-error__btn">Reintentar</button>
          </div>
        )}

        {!cargando && !error && vista === "grid" && (
          <div className="rutas-grid">
            {rutasPaginadas.map((ruta, i) => (
              <div key={ruta.id} className="ruta-card-anim" style={{ animationDelay: `${i * 0.06}s` }}>
                <RutaCardGrid ruta={ruta} index={i} favoritos={favoritos} onToggleFavorito={handleToggleFavorito} user={user} />
              </div>
            ))}
          </div>
        )}

        {!cargando && !error && vista === "list" && (
          <div className="rutas-list">
            {rutasPaginadas.map((ruta, i) => (
              <div key={ruta.id} className="ruta-card-anim" style={{ animationDelay: `${i * 0.05}s` }}>
                <RutaCardList ruta={ruta} index={i} favoritos={favoritos} onToggleFavorito={handleToggleFavorito} user={user} />
              </div>
            ))}
          </div>
        )}

        {!cargando && !error && rutas.length === 0 && (
          <div className="rutas-empty">
            <div className="rutas-empty__icon">🌿</div>
            <h3 className="rutas-empty__title">No encontramos rutas</h3>
            <p className="rutas-empty__text">No hay rutas que coincidan con tu búsqueda.</p>
            <button onClick={() => setFiltro({ dificultad: "", buscar: "", orden: "" })} className="rutas-empty__btn">Ver todas las rutas</button>
          </div>
        )}

        {!cargando && !error && totalPaginas > 1 && (
          <div className="rutas-pagination">
            <button className="page-btn" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>←</button>
            {[...Array(totalPaginas)].map((_, i) => (
              <button key={i} className={`page-btn ${pagina === i + 1 ? "active" : ""}`} onClick={() => setPagina(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>→</button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}