import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../axiosConfig";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Ranking.css";

const MEDALLAS = ["🥇", "🥈", "🥉"];
const POSICION_COLORS = {
  1: { bg: "linear-gradient(135deg, #f6d365, #fda085)", border: "#f6d365", text: "#7a4a00" },
  2: { bg: "linear-gradient(135deg, #e0e0e0, #bdbdbd)", border: "#e0e0e0", text: "#424242" },
  3: { bg: "linear-gradient(135deg, #cd7f32, #a0522d)", border: "#cd7f32", text: "#fff" },
};
const PUNTOS_COLORS = { 1: "#c8960c", 2: "#757575", 3: "#a0522d" };

function AvatarIcon({ username, size = 44, fontSize = "1.1rem", pos }) {
  const colors = [
    ["#2d5a27","#b5d5a0"], ["#1e3d2f","#4a7c59"],
    ["#0d2a1a","#3a6b4a"], ["#1a3a2a","#5a8a6a"], ["#3a2a0d","#a0784a"],
  ];
  const idx = username ? username.charCodeAt(0) % colors.length : 0;
  const [from, to] = colors[idx];
  const posColor = pos && POSICION_COLORS[pos];
  const boxShadow = pos === 1
    ? "0 0 0 3px #f6d365, 0 8px 20px rgba(246,211,101,0.4)"
    : pos === 2 ? "0 0 0 3px #bdbdbd"
    : pos === 3 ? "0 0 0 3px #cd7f32"
    : "0 4px 12px rgba(26,46,26,0.2)";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: posColor ? posColor.bg : `linear-gradient(135deg, ${from}, ${to})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Lora', serif", fontWeight: 700, fontSize,
      color: posColor ? posColor.text : "#f7f5f0",
      flexShrink: 0, boxShadow,
    }}>
      {username ? username[0].toUpperCase() : "?"}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="skeleton-row">
      <div className="skeleton-block" style={{ width: 32, height: 20 }} />
      <div className="skeleton-block" style={{ width: 44, height: 44, borderRadius: "50%" }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton-block" style={{ height: 14, width: "40%", marginBottom: 8 }} />
        <div className="skeleton-block" style={{ height: 12, width: "25%" }} />
      </div>
      <div className="skeleton-block" style={{ height: 20, width: 60 }} />
    </div>
  );
}

function TablaJuegos({ data, user, tipo }) {
  if (!data || data.length === 0) {
    return (
      <div className="ranking-no-resultados">
        <p>Aún no hay partidas registradas.</p>
      </div>
    );
  }
  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div className="ranking-header">
        <div className="ranking-header-cell">#</div>
        <div className="ranking-header-cell">Jugador</div>
        <div className="ranking-header-cell">Puntos</div>
        <div className="ranking-header-cell">Partidas</div>
        {tipo === "trivia" && <div className="ranking-header-cell">Mejor</div>}
      </div>
      {data.map((entry, i) => {
        const esYo = user && entry.username === user.username;
        return (
          <div
            key={entry.username}
            className={`ranking-row ${esYo ? "yo" : ""}`}
            style={{
              background: entry.posicion <= 3
                ? `linear-gradient(to right, ${["rgba(246,211,101,0.06)","rgba(189,189,189,0.06)","rgba(205,127,50,0.06)"][entry.posicion-1]}, #fff)`
                : esYo ? "linear-gradient(to right, rgba(181,213,160,0.1), #fff)" : "#fff",
              border: esYo ? "1.5px solid rgba(74,124,89,0.3)" : "1px solid rgba(74,124,89,0.08)",
              animation: `fadeUp 0.4s ease ${i * 0.03}s both`,
            }}
          >
            <div className="ranking-posicion">
              {entry.posicion <= 3
                ? <span className="ranking-medalla">{MEDALLAS[entry.posicion - 1]}</span>
                : <span className="ranking-posicion-num">#{entry.posicion}</span>
              }
            </div>
            <div className="ranking-usuario">
              <AvatarIcon username={entry.username} size={36} fontSize="0.9rem" pos={entry.posicion <= 3 ? entry.posicion : null} />
              <div className="ranking-usuario-info">
                <div className="ranking-usuario-nombre">
                  <span className="ranking-usuario-username">{entry.username}</span>
                  {esYo && <span className="ranking-yo-badge">Tú</span>}
                </div>
                {entry.nombre_completo?.trim() && (
                  <div className="ranking-nombre-completo">{entry.nombre_completo}</div>
                )}
              </div>
            </div>
            <div className="ranking-puntos" style={{ color: PUNTOS_COLORS[entry.posicion] || "#2d5a27" }}>
              {entry.total_puntos?.toLocaleString() || 0}
            </div>
            <div className="ranking-km">{entry.partidas || 0}</div>
            {tipo === "trivia" && (
              <div className="ranking-dias">{entry.mejor_puntaje || 0}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Ranking() {
  const [ranking, setRanking] = useState([]);
  const [misStats, setMisStats] = useState(null);
  const [statsGlobales, setStatsGlobales] = useState(null);
  const [rankingJuegos, setRankingJuegos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoStats, setCargandoStats] = useState(false);
  const [cargandoJuegos, setCargandoJuegos] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("semanal");
  const [tabJuego, setTabJuego] = useState("trivia");
  const [buscar, setBuscar] = useState("");
  const [miPosicion, setMiPosicion] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) try { setUser(JSON.parse(u)); } catch {}
  }, []);

  const fetchRanking = useCallback(async () => {
    try {
      const res = await api.get("/api/ranking/ranking-completo/");
      setRanking(Array.isArray(res.data) ? res.data : []);
      const u = localStorage.getItem("user");
      if (u) {
        const parsed = JSON.parse(u);
        const found = res.data.find((r) => r.username === parsed.username);
        if (found) setMiPosicion(found.posicion);
      }
    } catch (e) {
      setError(e.response?.status === 401
        ? "Inicia sesión para ver el ranking."
        : "No se pudo cargar el ranking.");
    } finally { setCargando(false); }
  }, []);

  const fetchMisStats = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      setCargandoStats(true);
      const res = await api.get("/api/ranking/estadisticas-usuario/");
      setMisStats(res.data);
    } catch {} finally { setCargandoStats(false); }
  }, []);

  const fetchStatsGlobales = useCallback(async () => {
    try {
      const res = await api.get("/api/ranking/estadisticas-globales/");
      setStatsGlobales(res.data);
    } catch {}
  }, []);

  const fetchRankingJuegos = useCallback(async () => {
    try {
      setCargandoJuegos(true);
      const res = await api.get("/api/ranking/ranking-juegos/");
      setRankingJuegos(res.data);
    } catch {} finally { setCargandoJuegos(false); }
  }, []);

  useEffect(() => {
    fetchRanking(); fetchMisStats(); fetchStatsGlobales(); fetchRankingJuegos();
    intervalRef.current = setInterval(() => {
      fetchRanking(); fetchMisStats(); fetchStatsGlobales(); fetchRankingJuegos();
    }, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchRanking, fetchMisStats, fetchStatsGlobales, fetchRankingJuegos]);

  const rankingFiltrado = ranking.filter((r) =>
    r.username.toLowerCase().includes(buscar.toLowerCase()) ||
    r.nombre_completo?.toLowerCase().includes(buscar.toLowerCase())
  );
  const top3 = ranking.slice(0, 3);

  // Helper para construir el podio con 1, 2 o 3 elementos
  const buildPodio = (lista) => {
    if (!lista || lista.length === 0) return [];
    const top = lista.slice(0, 3);
    if (top.length === 1) return [{ item: top[0], posVisual: 1 }];
    if (top.length === 2) return [
      { item: top[1], posVisual: 2 },
      { item: top[0], posVisual: 1 },
    ];
    return [
      { item: top[1], posVisual: 2 },
      { item: top[0], posVisual: 1 },
      { item: top[2], posVisual: 3 },
    ];
  };

  const PODIO_SIZES =      { 1: 70,       2: 56,       3: 48 };
  const PODIO_FONTSIZES =  { 1: "1.8rem", 2: "1.4rem", 3: "1.2rem" };
  const PODIO_DELAYS =     { 1: "0s",     2: "0.1s",   3: "0.2s" };

  return (
    <div className="ranking-page">
      <Navbar />

      <div className="ranking-hero">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="ranking-hero-orb" style={{
            width:  [350, 200, 280, 150][i],
            height: [350, 200, 280, 150][i],
            background: `rgba(181,213,160,${[0.04, 0.06, 0.03, 0.07][i]})`,
            top:  ["-20%", "30%", "10%", "60%"][i],
            left: ["-5%",  "70%", "40%", "15%"][i],
          }} />
        ))}

        <div className="hero-inner">
          <div className="hero-titulo-wrap">
            <div>
              <p className="hero-label">Clasificación semanal</p>
              <h1 className="hero-titulo">🏆 Ranking de <em>Caminantes</em></h1>
            </div>
            {miPosicion && (
              <div className="mi-posicion-badge">
                <div className="mi-posicion-label">Tu posición</div>
                <div className="mi-posicion-valor">#{miPosicion}</div>
              </div>
            )}
          </div>

          {/* Podio caminantes */}
          {!cargando && !error && top3.length > 0 && tab !== "juegos" && (
            <div className="podio-wrap">
              {buildPodio(top3).map(({ item, posVisual }) => (
                <div key={item.username} className="podio-item"
                  style={{ animation: `podiumRise 0.6s ease ${PODIO_DELAYS[posVisual]} both` }}>
                  <AvatarIcon username={item.username} size={PODIO_SIZES[posVisual]} fontSize={PODIO_FONTSIZES[posVisual]} pos={posVisual} />
                  <div className={`podio-username podio-username-${posVisual}`}>{item.username}</div>
                  <div className={`podio-puntos-${posVisual}`}>{item.puntos_semanales?.toLocaleString()} pts</div>
                  <div className={`podio-base podio-base-${posVisual}`}>{MEDALLAS[posVisual - 1]}</div>
                </div>
              ))}
            </div>
          )}

          {/* Podio juegos */}
          {tab === "juegos" && rankingJuegos && (() => {
            const lista = tabJuego === "trivia" ? rankingJuegos.trivia : rankingJuegos.mapa_roto;
            const podio = buildPodio(lista);
            if (podio.length === 0) return null;
            return (
              <div className="podio-wrap" style={{ animation: "fadeUp 0.4s ease" }}>
                {podio.map(({ item, posVisual }) => (
                  <div key={item.username} className="podio-item"
                    style={{ animation: `podiumRise 0.6s ease ${PODIO_DELAYS[posVisual]} both` }}>
                    <AvatarIcon username={item.username} size={PODIO_SIZES[posVisual]} fontSize={PODIO_FONTSIZES[posVisual]} pos={posVisual} />
                    <div className={`podio-username podio-username-${posVisual}`}>{item.username}</div>
                    <div className={`podio-puntos-${posVisual}`}>{item.total_puntos?.toLocaleString()} pts</div>
                    <div className={`podio-base podio-base-${posVisual}`}>{MEDALLAS[posVisual - 1]}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="ranking-tabs">
            {[
              { key: "semanal", label: "📅 Semanal" },
              { key: "total",   label: "🏆 Total" },
              { key: "juegos",  label: "🎮 Juegos" },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`tab-btn ${tab === t.key ? "active" : ""}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="content-inner">
        <div className="ranking-layout">
          <div>
            {/* Tab Juegos */}
            {tab === "juegos" && (
              <div style={{ animation: "fadeUp 0.4s ease" }}>
                <div className="ranking-tabs" style={{ marginBottom: 16 }}>
                  {[
                    { key: "trivia",    label: "🧠 Trivia" },
                    { key: "mapa_roto", label: "🧩 Mapa Roto" },
                  ].map((t) => (
                    <button key={t.key} onClick={() => setTabJuego(t.key)} className={`tab-btn ${tabJuego === t.key ? "active" : ""}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {cargandoJuegos && [...Array(5)].map((_, i) => <SkeletonRow key={i} />)}

                {!cargandoJuegos && rankingJuegos && (
                  <TablaJuegos
                    data={tabJuego === "trivia" ? rankingJuegos.trivia : rankingJuegos.mapa_roto}
                    user={user}
                    tipo={tabJuego}
                  />
                )}

                <div className="stats-globales-wrap" style={{ marginTop: 16 }}>
                  <h3 className="stats-globales-titulo">ℹ️ Puntos por juego</h3>
                  <div className="stats-globales-grid">
                    <div className="stat-global-card">
                      <div className="stat-global-icono">🧠</div>
                      <div className="stat-global-info">
                        <span className="stat-global-label">Trivia</span>
                        <span className="stat-global-valor">100 pts por respuesta correcta</span>
                        <span className="stat-global-sub">Máximo 500 pts por categoría</span>
                      </div>
                    </div>
                    <div className="stat-global-card">
                      <div className="stat-global-icono">🧩</div>
                      <div className="stat-global-info">
                        <span className="stat-global-label">Mapa Roto</span>
                        <span className="stat-global-valor">Fácil 50 · Normal 100 · Difícil 200</span>
                        <span className="stat-global-sub">Puntos por nivel completado</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Semanal y Total */}
            {tab !== "juegos" && (
              <>
                <div className="ranking-search-wrap">
                  <span className="ranking-search-icon">🔍</span>
                  <input
                    className="ranking-search"
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    placeholder="Buscar caminante..."
                  />
                </div>

                {error && (
                  <div className="ranking-vacio">
                    <div className="ranking-vacio-icono">🔒</div>
                    <h3 className="ranking-vacio-titulo">Inicia sesión para ver el ranking</h3>
                    <p className="ranking-vacio-texto">El ranking está disponible para usuarios registrados.</p>
                    <Link to="/login" className="btn-login-error">Iniciar Sesión</Link>
                  </div>
                )}

                {cargando && !error && [...Array(8)].map((_, i) => <SkeletonRow key={i} />)}

                {!cargando && !error && (
                  <div style={{ animation: "fadeUp 0.4s ease" }}>
                    <div className="ranking-header">
                      <div className="ranking-header-cell">#</div>
                      <div className="ranking-header-cell">Caminante</div>
                      <div className="ranking-header-cell">Puntos</div>
                      <div className="ranking-header-cell km-h">Km</div>
                      <div className="ranking-header-cell dias-h">Días</div>
                    </div>

                    {rankingFiltrado.length === 0 && (
                      <div className="ranking-no-resultados">
                        <p>No se encontraron resultados para "{buscar}"</p>
                      </div>
                    )}

                    {rankingFiltrado.map((entry, i) => {
                      const esYo = user && entry.username === user.username;
                      const puntos = tab === "total" ? entry.total_puntos : entry.puntos_semanales;
                      return (
                        <div
                          key={entry.username}
                          className={`ranking-row ${esYo ? "yo" : ""}`}
                          style={{
                            background: entry.posicion <= 3
                              ? `linear-gradient(to right, ${["rgba(246,211,101,0.06)","rgba(189,189,189,0.06)","rgba(205,127,50,0.06)"][entry.posicion-1]}, #fff)`
                              : esYo ? "linear-gradient(to right, rgba(181,213,160,0.1), #fff)" : "#fff",
                            border: esYo ? "1.5px solid rgba(74,124,89,0.3)" : "1px solid rgba(74,124,89,0.08)",
                            animation: `fadeUp 0.4s ease ${i * 0.03}s both`,
                          }}
                        >
                          <div className="ranking-posicion">
                            {entry.posicion <= 3
                              ? <span className="ranking-medalla">{MEDALLAS[entry.posicion - 1]}</span>
                              : <span className="ranking-posicion-num">#{entry.posicion}</span>
                            }
                          </div>
                          <div className="ranking-usuario">
                            <AvatarIcon username={entry.username} size={36} fontSize="0.9rem" pos={entry.posicion <= 3 ? entry.posicion : null} />
                            <div className="ranking-usuario-info">
                              <div className="ranking-usuario-nombre">
                                <span className="ranking-usuario-username">{entry.username}</span>
                                {esYo && <span className="ranking-yo-badge">Tú</span>}
                              </div>
                              {entry.nombre_completo?.trim() && (
                                <div className="ranking-nombre-completo">{entry.nombre_completo}</div>
                              )}
                            </div>
                          </div>
                          <div className="ranking-puntos" style={{ color: PUNTOS_COLORS[entry.posicion] || "#2d5a27" }}>
                            {puntos?.toLocaleString() || 0}
                          </div>
                          <div className="ranking-km">{entry.distancia_km?.toFixed(1) || "0.0"}</div>
                          <div className="ranking-dias">{entry.dias_activos || 0}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!cargando && !error && statsGlobales && (
                  <div className="stats-globales-wrap" style={{ animation: "fadeUp 0.4s ease 0.2s both" }}>
                    <h3 className="stats-globales-titulo">📈 Estadísticas de la semana</h3>
                    <div className="stats-globales-grid">
                      <div className="stat-global-card">
                        <div className="stat-global-icono">🔥</div>
                        <div className="stat-global-info">
                          <span className="stat-global-label">Más activo esta semana</span>
                          <span className="stat-global-valor">{statsGlobales.mas_activo?.username || "—"}</span>
                          <span className="stat-global-sub">
                            {statsGlobales.mas_activo?.dias_activos || 0} días · {statsGlobales.mas_activo?.distancia_km?.toFixed(1) || "0.0"} km
                          </span>
                        </div>
                      </div>
                      <div className="stat-global-card">
                        <div className="stat-global-icono">
                          {(statsGlobales.comparativa?.diferencia ?? 0) >= 0 ? "📈" : "📉"}
                        </div>
                        <div className="stat-global-info">
                          <span className="stat-global-label">vs semana anterior</span>
                          <span className="stat-global-valor" style={{ color: (statsGlobales.comparativa?.diferencia ?? 0) >= 0 ? "#2d5a27" : "#c0392b" }}>
                            {(statsGlobales.comparativa?.diferencia ?? 0) >= 0 ? "+" : ""}
                            {statsGlobales.comparativa?.diferencia?.toLocaleString() || 0} pts
                          </span>
                          <span className="stat-global-sub">
                            Esta semana: {statsGlobales.comparativa?.puntos_esta_semana?.toLocaleString() || 0} pts · Semana anterior: {statsGlobales.comparativa?.puntos_semana_anterior?.toLocaleString() || 0} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!error && (
                  <div className="live-wrap">
                    <div className="live-dot" />
                    <span className="live-text">Actualiza cada 15 segundos</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="sidebar-sticky">
            {user && (
              <div className="sidebar-card" style={{ animation: "fadeUp 0.4s ease" }}>
                <h3 className="sidebar-titulo">📊 Mis estadísticas</h3>
                {cargandoStats ? (
                  <div className="spinner-wrap"><div className="spinner" /></div>
                ) : misStats ? (
                  <div>
                    {[
                      { icon: "⭐", label: "Puntos semanales", value: misStats.puntos_semanales?.toLocaleString() || 0 },
                      { icon: "🏅", label: "Puntos totales",   value: misStats.total_puntos?.toLocaleString() || 0 },
                      { icon: "📏", label: "Km totales",       value: `${misStats.distancia_total_km?.toFixed(1) || 0} km` },
                      { icon: "📅", label: "Días activos",     value: misStats.dias_activos || 0 },
                    ].map((s) => (
                      <div key={s.label} className="stat-row">
                        <div className="stat-row-izq">
                          <span>{s.icon}</span>
                          <span className="stat-row-label">{s.label}</span>
                        </div>
                        <span className="stat-row-valor">{s.value}</span>
                      </div>
                    ))}
                    {miPosicion && (
                      <div className="posicion-card">
                        <div className="posicion-card-label">Tu posición actual</div>
                        <div className="posicion-card-valor">#{miPosicion}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "#9a9a9a", textAlign: "center", padding: "16px 0" }}>
                    No hay estadísticas disponibles.
                  </p>
                )}
              </div>
            )}

            <div className="sidebar-card">
              <h3 className="sidebar-titulo-sm">ℹ️ ¿Cómo funciona?</h3>
              {[
                { icon: "🚶", text: "Cada 5 metros caminados = 10 puntos" },
                { icon: "🧠", text: "Trivia: hasta 500 pts por categoría" },
                { icon: "🧩", text: "Mapa Roto: 50 · 100 · 200 pts por nivel" },
                { icon: "📅", text: "El ranking semanal se resetea cada lunes" },
                { icon: "🏆", text: "Los top 3 reciben medalla de reconocimiento" },
              ].map((item) => (
                <div key={item.text} className="info-item">
                  <span>{item.icon}</span>
                  <p className="info-item-texto">{item.text}</p>
                </div>
              ))}
            </div>

            {!user && (
              <div className="cta-card">
                <div className="cta-icono">🏆</div>
                <h3 className="cta-titulo">¿Quieres aparecer aquí?</h3>
                <p className="cta-texto">Regístrate y empieza a sumar puntos caminando.</p>
                <Link to="/registro" className="btn-cta-primario">Registrarse gratis</Link>
                <Link to="/login"    className="btn-cta-secundario">Iniciar sesión</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}