import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../axiosConfig";
import "./RecorridoActivo.css";

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTiempo(seg) {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function RecorridoActivo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ruta, setRuta] = useState(null);
  const [fase, setFase] = useState("listo");
  const [distancia, setDistancia] = useState(0);
  const [tiempo, setTiempo] = useState(0);
  const [, setPosActual] = useState(null);
  const [errorGPS, setErrorGPS] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [resumen, setResumen] = useState(null);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const marcadorRef = useRef(null);
  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const posAnteriorRef = useRef(null);
  const distanciaRef = useRef(0);

  useEffect(() => {
    api.get(`/api/rutas/${id}/`).then((res) => setRuta(res.data)).catch(() => navigate("/rutas"));
  }, [id, navigate]);

  useEffect(() => {
    if (!ruta || mapInstance.current) return;

    const linkCSS = document.createElement("link");
    linkCSS.rel = "stylesheet";
    linkCSS.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(linkCSS);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      if (!mapRef.current || mapInstance.current) return;
      const L = window.L;

      let centro = [2.4448, -76.6147];
      if (ruta.ubicacion_inicio) {
        const parts = ruta.ubicacion_inicio.split(",").map(Number);
        if (parts.length === 2 && !isNaN(parts[0])) centro = parts;
      }

      const map = L.map(mapRef.current, { center: centro, zoom: 16, zoomControl: true });
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      if (ruta.coordenadas_ruta?.length > 1) {
        L.polyline(ruta.coordenadas_ruta, { color: "#2d5a27", weight: 4, opacity: 0.6, dashArray: "8,6" }).addTo(map);
      }

      const iconoUsuario = L.divIcon({
        html: `<div style="width:20px;height:20px;background:#2d5a27;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px rgba(45,90,39,0.4)"></div>`,
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      marcadorRef.current = L.marker(centro, { icon: iconoUsuario }).addTo(map);
    };
    document.body.appendChild(script);

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [ruta]);

  const iniciarRecorrido = () => {
    if (!navigator.geolocation) {
      setErrorGPS("Tu dispositivo no soporta GPS.");
      return;
    }

    setFase("activo");
    setDistancia(0);
    setTiempo(0);
    distanciaRef.current = 0;
    posAnteriorRef.current = null;

    timerRef.current = setInterval(() => setTiempo((t) => t + 1), 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosActual([latitude, longitude]);

        if (posAnteriorRef.current) {
          const [lat1, lon1] = posAnteriorRef.current;
          const d = calcularDistancia(lat1, lon1, latitude, longitude);
          if (d > 0.003) {
            distanciaRef.current += d;
            setDistancia(distanciaRef.current);
          }
        }
        posAnteriorRef.current = [latitude, longitude];

        if (marcadorRef.current && mapInstance.current) {
          marcadorRef.current.setLatLng([latitude, longitude]);
          mapInstance.current.panTo([latitude, longitude]);
        }
      },
      (err) => {
        setErrorGPS("No se pudo obtener tu ubicación GPS. Verifica los permisos.");
        console.error(err);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  };

  const finalizarRecorrido = () => {
    clearInterval(timerRef.current);
    navigator.geolocation.clearWatch(watchIdRef.current);
    setFase("finalizado");
  };

  const guardarRecorrido = async () => {
    setGuardando(true);
    try {
      const res = await api.post(`/api/rutas/${id}/recorridos/`, {
        distancia_km: distanciaRef.current.toFixed(2),
        tiempo_segundos: tiempo,
      });
      setResumen(res.data);
    } catch {
      alert("No se pudo guardar el recorrido. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const velocidadPromedio = tiempo > 0 ? (distancia / (tiempo / 3600)).toFixed(1) : "0.0";

  if (!ruta) return (
    <div className="recorrido-loading">
      <div className="recorrido-spinner" />
      <p>Cargando ruta...</p>
    </div>
  );

  return (
    <div className="recorrido-page">

      <div className="recorrido-header">
        <button className="recorrido-back" onClick={() => navigate(`/rutas/${id}`)}>← Volver</button>
        <div className="recorrido-header-info">
          <span className="recorrido-nombre">{ruta.nombre_ruta}</span>
          <span className={`recorrido-estado-badge recorrido-estado-badge--${fase}`}>
            {fase === "listo" ? "⏸ Listo" : fase === "activo" ? "🟢 En curso" : "✅ Finalizado"}
          </span>
        </div>
      </div>

      <div ref={mapRef} className="recorrido-mapa" />

      <div className="recorrido-metricas">
        <div className="metrica-card">
          <div className="metrica-valor">{distancia.toFixed(2)}</div>
          <div className="metrica-label">km recorridos</div>
        </div>
        <div className="metrica-card metrica-card--tiempo">
          <div className="metrica-valor">{formatTiempo(tiempo)}</div>
          <div className="metrica-label">tiempo</div>
        </div>
        <div className="metrica-card">
          <div className="metrica-valor">{velocidadPromedio}</div>
          <div className="metrica-label">km/h promedio</div>
        </div>
      </div>

      {errorGPS && <div className="recorrido-error">{errorGPS}</div>}

      <div className="recorrido-controles">
        {fase === "listo" && (
          <button className="btn-iniciar" onClick={iniciarRecorrido}>
            🥾 Iniciar recorrido
          </button>
        )}
        {fase === "activo" && (
          <button className="btn-finalizar" onClick={finalizarRecorrido}>
            🏁 Finalizar recorrido
          </button>
        )}
        {fase === "finalizado" && !resumen && (
          <button className="btn-guardar" onClick={guardarRecorrido} disabled={guardando}>
            {guardando ? "Guardando..." : "💾 Guardar recorrido"}
          </button>
        )}
      </div>

      {resumen && (
        <div className="recorrido-resumen">
          <div className="resumen-titulo">🎉 ¡Recorrido completado!</div>
          <div className="resumen-grid">
            <div className="resumen-item">
              <span className="resumen-icon">📍</span>
              <div>
                <div className="resumen-val">{distancia.toFixed(2)} km</div>
                <div className="resumen-lbl">Distancia</div>
              </div>
            </div>
            <div className="resumen-item">
              <span className="resumen-icon">⏱</span>
              <div>
                <div className="resumen-val">{formatTiempo(tiempo)}</div>
                <div className="resumen-lbl">Tiempo</div>
              </div>
            </div>
            <div className="resumen-item">
              <span className="resumen-icon">⭐</span>
              <div>
                <div className="resumen-val">{resumen.recorrido?.puntos_ganados || 0} pts</div>
                <div className="resumen-lbl">Puntos ganados</div>
              </div>
            </div>
          </div>
          <button className="btn-volver" onClick={() => navigate(`/rutas/${id}`)}>← Volver a la ruta</button>
          <button className="btn-perfil" onClick={() => navigate("/perfil")}>Ver mi perfil</button>
        </div>
      )}
    </div>
  );
}