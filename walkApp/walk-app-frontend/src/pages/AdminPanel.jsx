import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../axiosConfig";
import "./AdminPanel.css";

const AVATAR_COLORS = [
  ["#2d5a27","#b5d5a0"], ["#7c3aed","#c4b5fd"],
  ["#0369a1","#7dd3fc"], ["#b45309","#fcd34d"],
];

function useAdminGuard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { navigate("/login"); return; }
    try {
      const parsed = JSON.parse(u);
      const esAdmin = parsed.es_admin || parsed.is_staff || parsed.rol === "admin";
      if (!esAdmin) { navigate("/"); return; }
      setUser(parsed);
    } catch { navigate("/login"); }
  }, [navigate]);
  return user;
}

function Avatar({ username, size = 36 }) {
  const idx = username ? username.charCodeAt(0) % AVATAR_COLORS.length : 0;
  const [from, to] = AVATAR_COLORS[idx];
  return (
    <div className="admin-avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg,${from},${to})` }}>
      {username?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function RolBadge({ rol }) {
  const cfg = {
    admin:   { label: "Admin",   bg: "#7c3aed22", color: "#c4b5fd", border: "#7c3aed44" },
    usuario: { label: "Usuario", bg: "#2d5a2722", color: "#86efac", border: "#2d5a2744" },
  };
  const c = cfg[rol] || cfg.usuario;
  return (
    <span className="rol-badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function StatCard({ emoji, label, value, color = "#b5d5a0" }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icono" style={{ background: `${color}18` }}>{emoji}</div>
      <div>
        <div className="stat-card-valor">{value}</div>
        <div className="stat-card-label" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}

function BarChart({ data, label }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <p className="chart-label">{label}</p>
      <div className="barchart-wrap">
        {data.map((d, i) => (
          <div key={i} className="barchart-col">
            <div className="barchart-bar" style={{ height: `${Math.max((d.count / max) * 70, 3)}px` }} />
            <span className="barchart-fecha">{d.fecha}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="admin-spinner">Cargando...</div>;
}

function SeccionDashboard() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get("/api/admin/dashboard/").then(r => setData(r.data)).catch(() => {}).finally(() => setCargando(false));
  }, []);

  if (cargando) return <Spinner />;
  if (!data) return null;

  const { resumen, usuarios_por_dia, rutas_top, roles } = data;

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <h2 className="seccion-titulo">Panel de Control</h2>

      <div className="stats-grid">
        <StatCard emoji="👥" label="Usuarios totales"  value={resumen.total_usuarios}      color="#b5d5a0" />
        <StatCard emoji="🟢" label="Activos hoy"       value={resumen.usuarios_activos_hoy} color="#4caf50" />
        <StatCard emoji="🏔️" label="Rutas"             value={resumen.total_rutas}          color="#7dd3fc" />
        <StatCard emoji="📸" label="Publicaciones"     value={resumen.total_publicaciones}  color="#fcd34d" />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <BarChart data={usuarios_por_dia} label="Usuarios activos · últimos 7 días" />
        </div>
        <div className="chart-card">
          <p className="chart-label">Top 5 rutas más vistas</p>
          {rutas_top.map((r, i) => (
            <div key={i} className="top-ruta-row">
              <span className="top-ruta-num">{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div className="top-ruta-nombre">{r.nombre}</div>
                <div className="top-ruta-barra-track">
                  <div className="top-ruta-barra-fill" style={{ width: `${(r.vistas / (rutas_top[0]?.vistas || 1)) * 100}%` }} />
                </div>
              </div>
              <span className="top-ruta-vistas">{r.vistas}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="roles-card">
        <p className="chart-label">Distribución de roles</p>
        <div className="roles-wrap">
          {[
            { label: "Usuarios", emoji: "🥾", color: "#86efac", count: roles.usuario },
            { label: "Admins",   emoji: "⚙️", color: "#c4b5fd", count: roles.admin },
          ].map((r) => (
            <div key={r.label} className="rol-item">
              <span style={{ fontSize: "1.2rem" }}>{r.emoji}</span>
              <div>
                <div className="rol-item-count" style={{ color: r.color }}>{r.count}</div>
                <div className="rol-item-label">{r.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SeccionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [cambiandoRol, setCambiandoRol] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const fetchUsuarios = useCallback(async () => {
    setCargando(true);
    try { const r = await api.get("/api/admin/usuarios/"); setUsuarios(r.data.usuarios); }
    catch {} finally { setCargando(false); }
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const handleCambiarRol = async (userId, nuevoRol) => {
    setCambiandoRol(userId);
    try {
      await api.patch(`/api/admin/usuarios/${userId}/rol/`, { rol: nuevoRol });
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, rol: nuevoRol } : u));
      showToast("Rol actualizado correctamente");
    } catch { showToast("Error al cambiar rol", false); }
    finally { setCambiandoRol(null); }
  };

  const handleEliminar = async (userId, username) => {
    if (!window.confirm(`¿Eliminar al usuario "${username}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/api/admin/usuarios/${userId}/eliminar/`);
      setUsuarios(prev => prev.filter(u => u.id !== userId));
      showToast("Usuario eliminado");
    } catch { showToast("Error al eliminar usuario", false); }
  };

  const filtrados = usuarios.filter(u => {
    const matchBusqueda = u.username.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase());
    const matchRol = filtroRol === "todos" || u.rol === filtroRol;
    return matchBusqueda && matchRol;
  });

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      {toast && <div className={`admin-toast ${toast.ok ? "ok" : "error"}`}>{toast.ok ? "✅" : "❌"} {toast.msg}</div>}
      <div className="seccion-header">
        <h2 className="seccion-titulo" style={{ marginBottom: 0 }}>Usuarios ({usuarios.length})</h2>
        <button className="btn-actualizar" onClick={fetchUsuarios}>↻ Actualizar</button>
      </div>
      <div className="filtros-wrap">
        <input className="admin-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por usuario o email..." />
        <div className="filtros-botones">
          {["todos","usuario","admin"].map(r => (
            <button key={r} onClick={() => setFiltroRol(r)} className={`filtro-btn ${filtroRol === r ? "activo" : "inactivo"}`}>
              {r === "todos" ? "Todos" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {cargando ? <Spinner /> : (
        <div className="usuarios-lista">
          {filtrados.map(u => (
            <div key={u.id} className="usuario-row">
              <Avatar username={u.username} size={38} />
              <div className="usuario-info">
                <div className="usuario-nombre-wrap">
                  <span className="usuario-nombre">{u.username}</span>
                  <RolBadge rol={u.rol} />
                  {!u.is_active && <span className="usuario-inactivo-badge">Inactivo</span>}
                </div>
                <div className="usuario-email">{u.email}</div>
                <div className="usuario-meta">Registrado: {u.date_joined} · Último login: {u.last_login || "Nunca"}</div>
              </div>
              <select className="usuario-select" value={u.rol} onChange={e => handleCambiarRol(u.id, e.target.value)} disabled={cambiandoRol === u.id}>
                <option value="usuario">Usuario</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn-eliminar-usuario" onClick={() => handleEliminar(u.id, u.username)}>🗑️</button>
            </div>
          ))}
          {filtrados.length === 0 && <div className="sin-resultados">No se encontraron usuarios.</div>}
        </div>
      )}
    </div>
  );
}

function SeccionRutas() {
  const [rutas, setRutas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroDif, setFiltroDif] = useState("todas");
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const fetchRutas = useCallback(async () => {
    setCargando(true);
    try { const r = await api.get("/api/admin/rutas/"); setRutas(r.data.rutas); }
    catch {} finally { setCargando(false); }
  }, []);

  useEffect(() => { fetchRutas(); }, [fetchRutas]);

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar la ruta "${nombre}"?`)) return;
    try {
      await api.delete(`/api/admin/rutas/${id}/eliminar/`);
      setRutas(prev => prev.filter(r => r.id !== id));
      showToast("Ruta eliminada");
    } catch { showToast("Error al eliminar ruta", false); }
  };

  const difConfig = {
    FACIL:    { label: "Fácil",    color: "#4caf50", bg: "rgba(76,175,80,0.12)" },
    MODERADO: { label: "Moderado", color: "#ff9800", bg: "rgba(255,152,0,0.12)" },
    DIFICIL:  { label: "Difícil",  color: "#f44336", bg: "rgba(244,67,54,0.12)" },
    EXTREMO:  { label: "Extremo",  color: "#9c27b0", bg: "rgba(156,39,176,0.12)" },
  };

  const filtradas = rutas.filter(r => {
    const matchBusqueda = r.nombre_ruta.toLowerCase().includes(busqueda.toLowerCase());
    const matchDif = filtroDif === "todas" || r.dificultad === filtroDif;
    return matchBusqueda && matchDif;
  });

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      {toast && <div className={`admin-toast ${toast.ok ? "ok" : "error"}`}>{toast.ok ? "✅" : "❌"} {toast.msg}</div>}
      <div className="seccion-header">
        <h2 className="seccion-titulo" style={{ marginBottom: 0 }}>Rutas ({rutas.length})</h2>
        <button className="btn-actualizar" onClick={fetchRutas}>↻ Actualizar</button>
      </div>
      <div className="filtros-wrap">
        <input className="admin-input" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ruta..." />
        <div className="filtros-botones">
          {["todas","FACIL","MODERADO","DIFICIL","EXTREMO"].map(d => (
            <button key={d} onClick={() => setFiltroDif(d)} className={`filtro-btn ${filtroDif === d ? "activo" : "inactivo"}`}>
              {d === "todas" ? "Todas" : difConfig[d]?.label}
            </button>
          ))}
        </div>
      </div>
      {cargando ? <Spinner /> : (
        <div className="rutas-lista">
          {filtradas.map(r => {
            const dif = difConfig[r.dificultad] || { label: r.dificultad, color: "#9e9e9e", bg: "rgba(158,158,158,0.1)" };
            return (
              <div key={r.id} className="ruta-admin-row">
                <div className="ruta-admin-info">
                  <div className="ruta-admin-nombre-wrap">
                    <span className="ruta-admin-nombre">{r.nombre_ruta}</span>
                    <span className="ruta-admin-badge" style={{ background: dif.bg, color: dif.color }}>{dif.label}</span>
                  </div>
                  <div className="ruta-admin-meta">
                    <span>📏 {r.longitud} km</span>
                    <span>👁️ {r.vistas} vistas</span>
                    <span>👤 {r.creada_por}</span>
                    <span>📅 {r.fecha_creacion}</span>
                  </div>
                </div>
                <div className="ruta-admin-acciones">
                  <Link to={`/rutas/${r.id}`} className="btn-ver-ruta-admin">Ver →</Link>
                  <button className="btn-eliminar-ruta-admin" onClick={() => handleEliminar(r.id, r.nombre_ruta)}>🗑️</button>
                </div>
              </div>
            );
          })}
          {filtradas.length === 0 && <div className="sin-resultados">No se encontraron rutas.</div>}
        </div>
      )}
    </div>
  );
}

function SeccionSOS() {
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("PENDIENTE");
  const [cambiando, setCambiando] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const fetchAlertas = useCallback(async () => {
    setCargando(true);
    try {
      const r = await api.get("/api/admin/sos/");
      setAlertas(r.data.alertas || []);
    } catch {} finally { setCargando(false); }
  }, []);

  useEffect(() => { fetchAlertas(); }, [fetchAlertas]);

  const handleCambiarEstado = async (id, nuevoEstado) => {
    setCambiando(id);
    try {
      await api.patch(`/api/admin/sos/${id}/atender/`, { estado: nuevoEstado });
      setAlertas(prev => prev.map(a => a.id === id ? { ...a, estado: nuevoEstado } : a));
      showToast(`Alerta marcada como ${nuevoEstado}`);
    } catch { showToast("Error al actualizar alerta", false); }
    finally { setCambiando(null); }
  };

  const ESTADO_CONFIG = {
    PENDIENTE: { label: "Pendiente", color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)" },
    ATENDIDA:  { label: "Atendida",  color: "#86efac", bg: "rgba(134,239,172,0.12)", border: "rgba(134,239,172,0.25)" },
    FALSA:     { label: "Falsa",     color: "#fcd34d", bg: "rgba(252,211,77,0.12)",  border: "rgba(252,211,77,0.25)"  },
  };

  const filtradas = filtroEstado === "TODAS"
    ? alertas
    : alertas.filter(a => a.estado === filtroEstado);

  const pendientes = alertas.filter(a => a.estado === "PENDIENTE").length;

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      {toast && <div className={`admin-toast ${toast.ok ? "ok" : "error"}`}>{toast.ok ? "✅" : "❌"} {toast.msg}</div>}

      <div className="seccion-header">
        <div>
          <h2 className="seccion-titulo" style={{ marginBottom: 4 }}>
            🆘 Alertas SOS
            {pendientes > 0 && <span className="sos-pendientes-badge">{pendientes} pendiente{pendientes !== 1 ? "s" : ""}</span>}
          </h2>
        </div>
        <button className="btn-actualizar" onClick={fetchAlertas}>↻ Actualizar</button>
      </div>

      <div className="filtros-wrap">
        <div className="filtros-botones">
          {["PENDIENTE", "ATENDIDA", "FALSA", "TODAS"].map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)} className={`filtro-btn ${filtroEstado === e ? "activo" : "inactivo"}`}>
              {e === "TODAS" ? "Todas" : ESTADO_CONFIG[e]?.label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? <Spinner /> : (
        <div className="alertas-lista">
          {filtradas.length === 0 && (
            <div className="sin-resultados">
              {filtroEstado === "PENDIENTE" ? "No hay alertas pendientes. ✅" : "No hay alertas en esta categoría."}
            </div>
          )}
          {filtradas.map(a => {
            const cfg = ESTADO_CONFIG[a.estado] || ESTADO_CONFIG.PENDIENTE;
            return (
              <div key={a.id} className={`alerta-row ${a.estado === "PENDIENTE" ? "alerta-row--urgente" : ""}`}>
                <div className="alerta-header">
                  <div className="alerta-usuario">
                    <span className="alerta-usuario-nombre">👤 {a.usuario}</span>
                    {a.ruta && <span className="alerta-ruta-tag">🏔️ {a.ruta}</span>}
                  </div>
                  <span className="alerta-estado-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                    {cfg.label}
                  </span>
                </div>

                <div className="alerta-meta">
                  <span>🕐 {a.fecha_hora}</span>
                  {a.maps_url && (
                    <a href={a.maps_url} target="_blank" rel="noopener noreferrer" className="alerta-maps-link">
                      📍 Ver en Google Maps
                    </a>
                  )}
                  {!a.maps_url && <span className="alerta-sin-gps">📍 Sin GPS</span>}
                </div>

                {a.mensaje && (
                  <div className="alerta-mensaje">💬 {a.mensaje}</div>
                )}

                {a.estado === "PENDIENTE" && (
                  <div className="alerta-acciones">
                    <button
                      className="btn-atender"
                      onClick={() => handleCambiarEstado(a.id, "ATENDIDA")}
                      disabled={cambiando === a.id}
                    >
                      {cambiando === a.id ? "..." : "✅ Marcar atendida"}
                    </button>
                    <button
                      className="btn-falsa"
                      onClick={() => handleCambiarEstado(a.id, "FALSA")}
                      disabled={cambiando === a.id}
                    >
                      ⚠️ Falsa alarma
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SECCIONES = [
  { key: "dashboard", label: "Dashboard",   emoji: "📊" },
  { key: "usuarios",  label: "Usuarios",    emoji: "👥" },
  { key: "rutas",     label: "Rutas",       emoji: "🏔️" },
  { key: "sos",       label: "SOS",         emoji: "🆘" },
];

export default function AdminPanel() {
  const user = useAdminGuard();
  const [seccion, setSeccion] = useState("dashboard");
  const [sosPendientes, setSosPendientes] = useState(0);

  useEffect(() => {
    api.get("/api/admin/sos/")
      .then(r => setSosPendientes((r.data.alertas || []).filter(a => a.estado === "PENDIENTE").length))
      .catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <div className="admin-page">
      {/* Sidebar — visible solo en desktop */}
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Link to="/" className="admin-sidebar-logo">
            <div className="admin-sidebar-logo-icon">🌿</div>
            <span className="admin-sidebar-logo-text">Walk App</span>
          </Link>
          <div className="admin-sidebar-badge">
            <div className="admin-sidebar-badge-label">Panel Admin</div>
            <div className="admin-sidebar-badge-user">⚙️ {user.username}</div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {SECCIONES.map(s => (
            <button
              key={s.key}
              onClick={() => setSeccion(s.key)}
              className={`admin-nav-btn ${seccion === s.key ? "active" : ""}`}
            >
              <span className="admin-nav-btn-emoji">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-volver-link">← Volver al sitio</Link>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="admin-contenido">
        {seccion === "dashboard" && <SeccionDashboard />}
        {seccion === "usuarios"  && <SeccionUsuarios />}
        {seccion === "rutas"     && <SeccionRutas />}
        {seccion === "sos"       && <SeccionSOS />}
      </div>

      {/* Barra inferior — visible solo en móvil */}
      <nav className="bottom-nav">
        {SECCIONES.map(s => (
          <button
            key={s.key}
            className={`bottom-nav-item ${seccion === s.key ? "active" : ""}`}
            onClick={() => setSeccion(s.key)}
          >
            <span className="bottom-nav-icon">{s.emoji}</span>
            <span className="bottom-nav-label">{s.label}</span>
            {s.key === "sos" && sosPendientes > 0 && (
              <span className="bottom-nav-sos-dot" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}