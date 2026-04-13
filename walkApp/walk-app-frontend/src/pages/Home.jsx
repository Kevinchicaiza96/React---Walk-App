import { useState, useEffect, useRef } from "react";
import api from "../axiosConfig";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Home.css";

const TESTIMONIALS = [
  { name: "Juan Pérez",       role: "Explorador Activo",       text: "Walk App ha transformado mis caminatas. Encuentro rutas increíbles y la comunidad es fantástica.",            imagen: "/images/cambiar1.png" },
  { name: "María González",   role: "Amante de la Naturaleza", text: "Me encanta la función de dificultad y distancia. Siempre encuentro la ruta perfecta para mi nivel.",         imagen: "/images/cambiar2 (1).png" },
  { name: "Carlos Rodríguez", role: "Caminante Urbano",        text: "La app es súper intuitiva. Ahora planificar mis salidas es mucho más fácil y divertido.",                    imagen: "/images/cambiar3.png" },
];

const CAROUSEL_MSGS = [
  "Descarga mapas y rutas para navegación offline.",
  "Planifica tu aventura con mapas, rutas y recomendaciones.",
  "Comparte tus recorridos y experiencias con otros caminantes.",
  "Conéctate con la naturaleza desde tu smartphone.",
  "Rutas, mapas y más a un clic.",
  "La herramienta ideal para caminantes.",
];

const DIFICULTAD_COLORS = { FACIL: "#4caf50", MODERADO: "#ff9800", DIFICIL: "#f44336", EXTREMO: "#9c27b0" };
const DIFICULTAD_LABELS = { FACIL: "Fácil", MODERADO: "Moderado", DIFICIL: "Difícil", EXTREMO: "Extremo" };
const RUTA_COLORS = ["#2d5a27", "#4a7c59", "#3a6b4a", "#1e3d2f", "#4d6741", "#3d7a52"];

function useIntersectionObserver(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function AnimatedSection({ children, delay = 0, direction = "bottom", className = "" }) {
  const [ref, visible] = useIntersectionObserver();
  const transforms = { bottom: "translateY(40px)", left: "translateX(-40px)", right: "translateX(40px)" };
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : transforms[direction],
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`
    }}>
      {children}
    </div>
  );
}

function DifficultyBadge({ level }) {
  return (
    <span className="difficulty-badge" style={{ background: DIFICULTAD_COLORS[level] || "#888" }}>
      {DIFICULTAD_LABELS[level] || level}
    </span>
  );
}

export default function WalkApp() {
  const [rutas, setRutas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState({ dificultad: "", buscar: "" });
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [hoveredRuta, setHoveredRuta] = useState(null);

  useEffect(() => {
    const fetchRutas = async () => {
      try {
        setCargando(true); setError(null);
        const params = {};
        if (filtro.dificultad) params.dificultad = filtro.dificultad;
        if (filtro.buscar) params.buscar = filtro.buscar;
        const res = await api.get("/api/rutas/", { params });
        setRutas(Array.isArray(res.data) ? res.data : (res.data.rutas || []));
      } catch { setError("No se pudieron cargar las rutas."); }
      finally { setCargando(false); }
    };
    fetchRutas();
  }, [filtro]);

  useEffect(() => {
    const timer = setInterval(() => setCarouselIdx((i) => (i + 1) % CAROUSEL_MSGS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="home-page">
      <Navbar />

      {}
      <section className="hero-section">
        <div className="hero-orb hero-orb--1" />
        <div className="hero-orb hero-orb--2" />
        <div className="hero-orb hero-orb--3" />
        <div className="hero-orb hero-orb--4" />
        <div className="hero-orb hero-orb--5" />
        <div className="hero-orb hero-orb--6" />
        <div className="hero-inner">
          <div className="hero-eyebrow">Popayán · Colombia</div>
          <h1 className="hero-title">
            Descubre tu Próxima<br />
            <em>Aventura</em>
          </h1>
          <p className="hero-subtitle">Cada Paso Cuenta</p>
          <div className="hero-buttons">
            <a href="/registro" className="btn-primary hero-btn-primary">¡Únete Ahora!</a>
            <a href="#rutas" className="btn-outline hero-btn-outline">Explorar Rutas</a>
          </div>
          <div className="hero-stats">
            {[["120+", "Rutas"], ["5K+", "Caminantes"], ["98%", "Satisfacción"]].map(([num, label]) => (
              <div key={label} className="hero-stat">
                <div className="hero-stat__num">{num}</div>
                <div className="hero-stat__label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {}
      <section className="about-section">
        <div className="about-inner">
          <div className="about-grid">
            <AnimatedSection direction="left">
              <div className="about-eyebrow">Tu Compañero de Senderismo en Popayán</div>
              <h2 className="about-title">¿Quiénes Somos?</h2>
              <p className="about-text">En Walk App, creemos que cada paso es una oportunidad para conectar con la naturaleza y con otros entusiastas.</p>
              <p className="about-text" style={{ marginBottom: 0 }}>Nuestra misión es inspirar a más personas a salir, moverse y descubrir la belleza natural y cultural que nos rodea.</p>
            </AnimatedSection>
            <AnimatedSection direction="right">
              <div className="features-grid">
                {[
                  { icon: "🗺️", title: "Rutas Verificadas",      desc: "Descubre senderos detallados con información precisa." },
                  { icon: "👥", title: "Comunidad Activa",        desc: "Conecta con caminantes, comparte experiencias y únete a grupos." },
                  { icon: "🎮", title: "Juegos y Ranking", desc: "Trivia senderista, rompecabezas de rutas y tabla de posiciones." },
                  { icon: "📍", title: "GPS Preciso",             desc: "Navegación offline para rutas sin señal." },
                ].map((feat, i) => (
                  <AnimatedSection key={feat.title} delay={i * 0.1}>
                    <div className="feature-card">
                      <div className="feature-card__icon">{feat.icon}</div>
                      <h4 className="feature-card__title">{feat.title}</h4>
                      <p className="feature-card__desc">{feat.desc}</p>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {}
      <section id="rutas" className="rutas-section">
        <div className="rutas-inner">
          <AnimatedSection>
            <div className="section-header">
              <div className="section-eyebrow">Explorar</div>
              <h3 className="section-title">Explora Nuestros Senderos en Popayán</h3>
              <p className="section-subtitle">"Naturaleza que inspira, senderos que transforman."</p>
              <div className="section-line" />
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="filtros-row">
              <select value={filtro.dificultad} onChange={(e) => setFiltro((f) => ({ ...f, dificultad: e.target.value }))} className="filtros-select">
                <option value="">Todas las dificultades</option>
                <option value="FACIL">Fácil</option>
                <option value="MODERADO">Moderado</option>
                <option value="DIFICIL">Difícil</option>
                <option value="EXTREMO">Extremo</option>
              </select>
              <input value={filtro.buscar} onChange={(e) => setFiltro((f) => ({ ...f, buscar: e.target.value }))}
                placeholder="Buscar ruta..." className="filtros-input" />
              <button onClick={() => setFiltro({ dificultad: "", buscar: "" })} className="filtros-clear">Limpiar</button>
            </div>
          </AnimatedSection>

          {cargando && (
            <div className="rutas-loading">
              <div className="rutas-spinner" />
              <p className="rutas-loading__text">Cargando rutas...</p>
            </div>
          )}

          {error && (
            <div className="rutas-error">
              <div className="rutas-error__icon">⚠️</div>
              <p className="rutas-error__text">{error}</p>
            </div>
          )}

          {!cargando && !error && (
            <div className="rutas-home-grid">
              {rutas.map((ruta, i) => (
                <AnimatedSection key={ruta.id} delay={i * 0.08}>
                  <div
                    onMouseEnter={() => setHoveredRuta(ruta.id)}
                    onMouseLeave={() => setHoveredRuta(null)}
                    className={`ruta-home-card ${hoveredRuta === ruta.id ? "ruta-home-card--hovered" : "ruta-home-card--default"}`}>
                    <div className="ruta-home-card__thumb"
                      style={{ background: ruta.imagen_url ? "transparent" : `linear-gradient(135deg, ${RUTA_COLORS[i % RUTA_COLORS.length]}, #b5d5a0)` }}>
                      {ruta.imagen_url
                        ? <img src={ruta.imagen_url} alt={ruta.nombre_ruta} className="ruta-home-card__img" />
                        : <span className="ruta-home-card__placeholder">🏔️</span>
                      }
                      <div className="ruta-home-card__badge-wrap">
                        <DifficultyBadge level={ruta.dificultad} />
                      </div>
                    </div>
                    <div className="ruta-home-card__body">
                      <h4 className="ruta-home-card__name">{ruta.nombre_ruta}</h4>
                      <p className="ruta-home-card__desc">
                        {ruta.descripcion ? ruta.descripcion.substring(0, 80) + (ruta.descripcion.length > 80 ? "..." : "") : "Sin descripción"}
                      </p>
                      <div className="ruta-home-card__footer">
                        <span className="ruta-home-card__meta">
                          📏 {ruta.longitud} km
                          {ruta.duracion_estimada && <span className="ruta-home-card__meta-dur">⏱ {ruta.duracion_estimada}</span>}
                        </span>
                        <div className="ruta-actions">
                          <a href={`/rutas/${ruta.id}/`} className="ruta-home-card__btn-ver">Ver Ruta</a>
                          <button className="ruta-home-card__btn-guardar">♡ Guardar</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          )}

          {!cargando && !error && rutas.length === 0 && (
            <div className="rutas-empty">
              <div className="rutas-empty__icon">🌿</div>
              <p>No se encontraron rutas con esos filtros.</p>
            </div>
          )}

          <div className="rutas-cta">
            <AnimatedSection>
              <a href="/rutas/" className="rutas-cta__btn">Ver Todas las Rutas</a>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {}
      <section className="testimonials-section">
        <div className="testimonials-inner">
          <AnimatedSection>
            <div className="testimonials-header">
              <div className="section-eyebrow">Comunidad</div>
              <h3 className="section-title">Lo que Dicen Nuestros Caminantes</h3>
              <p className="section-subtitle">"Experiencias reales, aventuras inolvidables."</p>
              <div className="section-line" />
            </div>
          </AnimatedSection>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 0.12} direction={["left", "bottom", "right"][i]}>
                <div className="testimonial-card">
                  <div className="testimonial-card__quote">"</div>
                  <p className="testimonial-card__text">{t.text}</p>
                  <div className="testimonial-card__author">
                    <img src={t.imagen} alt={t.name} className="testimonial-card__avatar"
                      onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                    <div className="testimonial-card__avatar-fallback">
                      {t.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="testimonial-card__name">{t.name}</div>
                      <div className="testimonial-card__role">{t.role}</div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {}
      <section className="carousel-section">
        <div className="carousel-bg" />
        <div className="carousel-inner">
          <h2 className="carousel-title">Explora, Comparte y Conecta</h2>
          <div className="carousel-msg-wrap">
            <p key={carouselIdx} className="carousel-msg">"{CAROUSEL_MSGS[carouselIdx]}"</p>
          </div>
          <div className="carousel-dots">
            {CAROUSEL_MSGS.map((_, i) => (
              <button key={i} onClick={() => setCarouselIdx(i)}
                className={`carousel-dot ${i === carouselIdx ? "carousel-dot--active" : "carousel-dot--inactive"}`} />
            ))}
          </div>
        </div>
      </section>

      {}
      <section className="cta-section">
        <AnimatedSection>
          <div className="cta-inner">
            <div className="cta-eyebrow">¿Listo para la Aventura?</div>
            <h2 className="cta-title">¿Listo para Explorar Popayán?</h2>
            <p className="cta-text">Únete a la comunidad de Walk App y empieza tu próxima caminata hoy mismo.</p>
            <div className="cta-buttons">
              <a href="/registro" className="cta-btn-register">👤 Regístrate Gratis</a>
              <button className="btn-outline cta-btn-app">📱 Descarga la App</button>
            </div>
          </div>
        </AnimatedSection>
      </section>

      <Footer />
    </div>
  );
}