import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../axiosConfig";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Juegos.css";

const BASE_STATIC = "http://127.0.0.1:8000/static/mapa_roto/images/imagenes_niveles";

const MAPAS = {
  facil:   { grid: 3, piezaSize: 110, mapas: ["coconuco_sanNicolas.png", "Pilimbala_CraterPurace.png", "Popayan_TresCruces.png"] },
  normal:  { grid: 4, piezaSize: 90,  mapas: ["Popayan_TermalesCoconuco.png", "Popayán-Purace.png"] },
  dificil: { grid: 5, piezaSize: 70,  mapas: ["Pilimbala_CraterPurace.jpg"] },
};

const PREGUNTAS = {
  rutas: [
    { pregunta: "¿Cuál es la dificultad más alta en la app?", opciones: ["Difícil","Extremo","Experto","Avanzado"], correcta: 1 },
    { pregunta: "¿Qué unidad se usa para medir la longitud de las rutas?", opciones: ["Metros","Millas","Kilómetros","Pasos"], correcta: 2 },
    { pregunta: "¿Qué muestra el mapa en el detalle de una ruta?", opciones: ["Solo llegada","Nada","Inicio, fin y trayecto","Solo el nombre"], correcta: 2 },
    { pregunta: "¿Cuántas categorías de dificultad existen?", opciones: ["2","3","4","5"], correcta: 2 },
    { pregunta: "¿Qué es la duración estimada de una ruta?", opciones: ["Tiempo en carro","Tiempo para completarla","Tiempo de registro","Tiempo de descanso"], correcta: 1 },
  ],
  equipo: [
    { pregunta: "¿Cuál es el calzado más recomendado para senderismo?", opciones: ["Tenis de ciudad","Botas de senderismo","Sandalias","Zapatos de cuero"], correcta: 1 },
    { pregunta: "¿Qué prenda es esencial para lluvia en el sendero?", opciones: ["Jeans","Camiseta de algodón","Impermeable o poncho","Suéter de lana"], correcta: 2 },
    { pregunta: "¿Cuántos litros de agua llevar en una caminata de 4 horas?", opciones: ["0.5 litros","1 litro","2 litros","5 litros"], correcta: 2 },
    { pregunta: "¿Para qué sirven los bastones de trekking?", opciones: ["Decorar","Apoyarse y reducir impacto","Marcar el camino","No tienen utilidad"], correcta: 1 },
    { pregunta: "¿Qué tipo de ropa es mejor para climas variables?", opciones: ["Algodón grueso","Ropa en capas","Solo una camiseta","Ropa de noche"], correcta: 1 },
  ],
  seguridad: [
    { pregunta: "¿Qué hacer antes de iniciar una ruta desconocida?", opciones: ["Salir sin avisar","Informar tu ruta y hora de regreso","Ir solo sin teléfono","Salir de noche"], correcta: 1 },
    { pregunta: "¿Qué hacer si te pierdes en el sendero?", opciones: ["Correr en cualquier dirección","Quedarte tranquilo y buscar referencias","Gritar sin parar","Dejar el equipo"], correcta: 1 },
    { pregunta: "¿Qué elemento de primeros auxilios es básico?", opciones: ["Tijeras de cocina","Botiquín con vendas","Libros","Ropa extra"], correcta: 1 },
    { pregunta: "¿Qué hacer si hay tormenta eléctrica?", opciones: ["Refugiarse bajo árbol alto","Caminar rápido","Alejarse de árboles y buscar terreno bajo","Usar paraguas metálico"], correcta: 2 },
    { pregunta: "¿Con qué frecuencia descansar en caminatas largas?", opciones: ["Solo al final","Cada 10 minutos","Cada 1-2 horas por 10-15 min","Nunca"], correcta: 2 },
  ],
  "flora-fauna": [
    { pregunta: "¿Qué ecosistema predomina cerca de Popayán?", opciones: ["Desierto","Bosque andino y páramo","Selva tropical baja","Tundra"], correcta: 1 },
    { pregunta: "¿Actitud correcta ante fauna silvestre?", opciones: ["Alimentarla con comida","Observar sin tocar","Intentar atraparla","Ahuyentarla con piedras"], correcta: 1 },
    { pregunta: "¿Qué ave es símbolo del Cauca?", opciones: ["Loro orejiamarillo","Cóndor de los Andes","Colibrí de vientre canela","Tángara"], correcta: 1 },
    { pregunta: "¿Qué hacer con los residuos en el recorrido?", opciones: ["Enterrarlos","Dejarlos en el camino","Llevarlos de vuelta","Quemarlos"], correcta: 2 },
    { pregunta: "¿Qué planta es común en los páramos colombianos?", opciones: ["Cactus","Frailejón","Palma de coco","Bambú gigante"], correcta: 1 },
  ],
  tecnicas: [
    { pregunta: "¿Cómo se llama caminar en zigzag en pendientes?", opciones: ["Sprint","Travesía o switchback","Carrera cruzada","Paso doble"], correcta: 1 },
    { pregunta: "¿Qué es el 'Leave No Trace'?", opciones: ["Tipo de sendero","Principio de no dejar rastro","Marca de equipos","Técnica de escalada"], correcta: 1 },
    { pregunta: "¿Cómo se llama el punto más alto de un sendero?", opciones: ["Nadir","Cima o cumbre","Base camp","Zenit"], correcta: 1 },
    { pregunta: "¿Qué significa 'desnivel' en una ruta?", opciones: ["Color del sendero","Diferencia de altura entre inicio y fin","Largo del camino","Dificultad del terreno"], correcta: 1 },
    { pregunta: "¿Qué se recomienda al descender pendientes empinadas?", opciones: ["Correr rápido","Ir de lado controlando el paso","Saltar de piedra en piedra","Bajar de espaldas"], correcta: 1 },
  ],
  lugares: [
    { pregunta: "¿En qué departamento está Popayán?", opciones: ["Nariño","Valle del Cauca","Cauca","Huila"], correcta: 2 },
    { pregunta: "¿Por qué apodo es conocida Popayán?", opciones: ["La Ciudad Roja","La Ciudad Blanca","La Ciudad de las Flores","La Ciudad Eterna"], correcta: 1 },
    { pregunta: "¿Cuál es el volcán más cercano a Popayán?", opciones: ["Nevado del Ruiz","Volcán Puracé","Volcán Galeras","Nevado del Huila"], correcta: 1 },
    { pregunta: "¿Qué parque natural está cerca de Popayán?", opciones: ["PNN Tayrona","PNN Puracé","PNN Los Nevados","PNN Amacayacu"], correcta: 1 },
    { pregunta: "¿Qué río atraviesa Popayán?", opciones: ["Río Cauca","Río Magdalena","Río Molino","Río Palacé"], correcta: 0 },
  ],
};

const CATEGORIAS = [
  { key: "rutas",       label: "Rutas",           emoji: "🗺️" },
  { key: "equipo",      label: "Equipo",           emoji: "🎒" },
  { key: "seguridad",   label: "Seguridad",        emoji: "⛑️" },
  { key: "flora-fauna", label: "Flora y Fauna",    emoji: "🌿" },
  { key: "tecnicas",    label: "Técnicas",         emoji: "🧗" },
  { key: "lugares",     label: "Lugares Icónicos", emoji: "📍" },
];

function MapaRoto({ onVolver, user }) {
  const [fase, setFase] = useState("menu");
  const [dificultad, setDificultad] = useState("facil");
  const [piezas, setPiezas] = useState([]);
  const [tablero, setTablero] = useState([]);
  const [pistas, setPistas] = useState(3);
  const [pistasUsadas, setPistasUsadas] = useState(0);
  const [mostrarPista, setMostrarPista] = useState(false);
  const [mostrarAgotadas, setMostrarAgotadas] = useState(false);
  const [imagenURL, setImagenURL] = useState("");
  const [arrastrando, setArrastrando] = useState(null);
  const [tiempoInicio, setTiempoInicio] = useState(null);
  const cfg = MAPAS[dificultad];

  const iniciarJuego = () => {
    const c = MAPAS[dificultad];
    if (c.mapas.length === 0) { alert("No hay imágenes para esta dificultad aún."); return; }
    const mapa = c.mapas[Math.floor(Math.random() * c.mapas.length)];
    setImagenURL(`${BASE_STATIC}/${dificultad}/${mapa}`);
    const total = c.grid * c.grid;
    const idx = Array.from({ length: total }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    setPiezas(idx); setTablero(Array(total).fill(null));
    setPistas(3); setPistasUsadas(0); setTiempoInicio(Date.now()); setFase("jugando");
  };

  const guardarResultadoMapa = async (imgURL, dif, pistasUso) => {
    try {
      const duracion = tiempoInicio ? Math.round((Date.now() - tiempoInicio) / 1000) : null;
      await api.post("/api/juegos/historial/", { dificultad: dif, duracion_segundos: duracion, pistas_usadas: pistasUso, imagen_mapa: imgURL.split('/').pop() });
    } catch (e) { console.error('Error guardando mapa roto:', e); }
  };

  const handleDropEnZona = (e, zonaIdx) => {
    e.preventDefault();
    if (!arrastrando) return;
    const nuevoPiezas = [...piezas]; const nuevoTablero = [...tablero];
    const piezaId = arrastrando.id; const origen = arrastrando.origen;
    if (origen === "piezas") {
      if (nuevoTablero[zonaIdx] !== null) nuevoPiezas.push(nuevoTablero[zonaIdx]);
      nuevoTablero[zonaIdx] = piezaId;
      const i = nuevoPiezas.indexOf(piezaId); if (i !== -1) nuevoPiezas.splice(i, 1);
    } else {
      nuevoTablero[origen] = nuevoTablero[zonaIdx] !== null ? nuevoTablero[zonaIdx] : null;
      nuevoTablero[zonaIdx] = piezaId;
    }
    setPiezas(nuevoPiezas); setTablero(nuevoTablero); setArrastrando(null);
    if (nuevoTablero.every((p, i) => p === i)) {
      setTimeout(() => { setFase("ganado"); if (user) guardarResultadoMapa(imagenURL, dificultad, pistasUsadas); }, 300);
    }
  };

  const handleDropEnPiezas = (e) => {
    e.preventDefault();
    if (!arrastrando || arrastrando.origen === "piezas") return;
    const nuevoTablero = [...tablero]; nuevoTablero[arrastrando.origen] = null;
    setTablero(nuevoTablero); setPiezas((prev) => [...prev, arrastrando.id]); setArrastrando(null);
  };

  const verPista = () => {
    if (pistas <= 0) { setMostrarAgotadas(true); return; }
    setPistas((p) => p - 1); setPistasUsadas((p) => p + 1);
    setMostrarPista(true); setTimeout(() => setMostrarPista(false), 5000);
  };

  const fullSize = cfg.grid * cfg.piezaSize;

  const renderPieza = (piezaId, size) => {
    const col = piezaId % cfg.grid;
    const row = Math.floor(piezaId / cfg.grid);
    return (
      <div style={{ width: size, height: size, backgroundImage: `url(${imagenURL})`, backgroundSize: `${fullSize}px ${fullSize}px`, backgroundPosition: `${-col * size}px ${-row * size}px`, border: "2px solid rgba(255,255,255,0.25)", boxSizing: "border-box" }} />
    );
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div className="mapa-header">
        <div className="mapa-header__left">
          <span className="mapa-header__emoji">🧩</span>
          <div>
            <h2 className="mapa-header__title">Mapa Roto</h2>
            <p className="mapa-header__sub">Arma el rompecabezas del sendero</p>
          </div>
        </div>
        <button onClick={onVolver} className="mapa-btn-volver">← Volver</button>
      </div>

      {fase === "menu" && (
        <div className="mapa-menu">
          <span className="mapa-menu__emoji">🗺️</span>
          <h3 className="mapa-menu__title">¿Puedes armar el mapa?</h3>
          <p className="mapa-menu__sub">Reconstruye las rutas de Popayán pieza a pieza</p>
          <div className="mapa-dificultad-grid">
            {[
              { key: "facil",   label: "Fácil",   sub: "3×3 · 9 piezas",  color: "#4caf50", n: MAPAS.facil.mapas.length },
              { key: "normal",  label: "Normal",  sub: "4×4 · 16 piezas", color: "#ff9800", n: MAPAS.normal.mapas.length },
              { key: "dificil", label: "Difícil", sub: "5×5 · 25 piezas", color: "#f44336", n: MAPAS.dificil.mapas.length },
            ].map((d) => (
              <button key={d.key} onClick={() => d.n > 0 && setDificultad(d.key)} className="mapa-dificultad-btn"
                style={{ background: dificultad === d.key ? `${d.color}22` : "rgba(255,255,255,0.07)", borderColor: dificultad === d.key ? d.color : "rgba(255,255,255,0.1)", cursor: d.n === 0 ? "not-allowed" : "pointer", opacity: d.n === 0 ? 0.4 : 1 }}>
                <div className="mapa-dificultad-btn__label" style={{ color: dificultad === d.key ? d.color : "#f7f5f0" }}>{d.label}</div>
                <div className="mapa-dificultad-btn__sub">{d.n === 0 ? "Próximamente" : d.sub}</div>
              </button>
            ))}
          </div>
          <button onClick={iniciarJuego} className="mapa-btn-comenzar">🎮 Comenzar</button>
        </div>
      )}

      {fase === "jugando" && (
        <div>
          <div className="mapa-jugando__topbar">
            <span className="mapa-jugando__score">
              Correctas: <strong>{tablero.filter((p, i) => p === i).length}/{cfg.grid * cfg.grid}</strong>
            </span>
            <div className="mapa-jugando__btns">
              <button onClick={verPista} className={`mapa-btn-pista ${pistas > 0 ? "mapa-btn-pista--activa" : "mapa-btn-pista--inactiva"}`}>
                🔍 Pista ({pistas})
              </button>
              <button onClick={() => setFase("menu")} className="mapa-btn-menu">↩ Menú</button>
            </div>
          </div>
          <div className="mapa-area">
            <div>
              <p className="mapa-tablero__label">Tablero</p>
              <div className="mapa-tablero__grid" style={{ display: "grid", gridTemplateColumns: `repeat(${cfg.grid},${cfg.piezaSize}px)`, gap: 2 }}>
                {tablero.map((piezaId, zonaIdx) => (
                  <div key={zonaIdx}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = "rgba(181,213,160,0.15)"; }}
                    onDragLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    onDrop={(e) => { e.currentTarget.style.background = "transparent"; handleDropEnZona(e, zonaIdx); }}
                    className="mapa-zona"
                    style={{ width: cfg.piezaSize, height: cfg.piezaSize, border: `2px dashed ${piezaId === zonaIdx && piezaId !== null ? "rgba(76,175,80,0.5)" : "rgba(255,255,255,0.12)"}` }}>
                    {piezaId !== null && (
                      <div draggable onDragStart={(e) => { setArrastrando({ id: piezaId, origen: zonaIdx }); e.dataTransfer.effectAllowed = "move"; }}
                        style={{ cursor: "grab", width: "100%", height: "100%", outline: piezaId === zonaIdx ? "2px solid #4caf50" : "none" }}>
                        {renderPieza(piezaId, cfg.piezaSize)}
                        {piezaId === zonaIdx && <div className="mapa-zona__indicator" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="mapa-piezas__container">
              <p className="mapa-piezas__label">Piezas ({piezas.length})</p>
              <div onDragOver={(e) => e.preventDefault()} onDrop={handleDropEnPiezas} className="mapa-piezas__drop">
                {piezas.map((piezaId) => (
                  <div key={piezaId} draggable onDragStart={(e) => { setArrastrando({ id: piezaId, origen: "piezas" }); e.dataTransfer.effectAllowed = "move"; }} className="mapa-pieza">
                    {renderPieza(piezaId, cfg.piezaSize)}
                  </div>
                ))}
                {piezas.length === 0 && <p className="mapa-piezas__vacio">Todas en el tablero</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {fase === "ganado" && (
        <div className="mapa-ganado">
          <span className="mapa-ganado__emoji">🎉</span>
          <h3 className="mapa-ganado__title">¡Felicidades!</h3>
          <p className="mapa-ganado__sub">Completaste el rompecabezas · nivel {dificultad}</p>
          {user && <p className="mapa-ganado__guardado">✅ Resultado guardado · {pistasUsadas} pista{pistasUsadas !== 1 ? "s" : ""} usada{pistasUsadas !== 1 ? "s" : ""}</p>}
          <img src={imagenURL} alt="Mapa completo" className="mapa-ganado__img" />
          <div className="mapa-ganado__btns">
            <button onClick={iniciarJuego} className="mapa-btn-otro">🔄 Otro mapa</button>
            <button onClick={() => setFase("menu")} className="mapa-btn-nivel">Cambiar nivel</button>
          </div>
        </div>
      )}

      {mostrarPista && (
        <div className="mapa-modal-overlay" onClick={() => setMostrarPista(false)}>
          <div className="mapa-pista-box">
            <img src={imagenURL} alt="Pista" className="mapa-pista-img" />
            <p className="mapa-pista-hint">Cierra en 5s · Clic para cerrar</p>
          </div>
        </div>
      )}

      {mostrarAgotadas && (
        <div className="mapa-agotadas-overlay" onClick={() => setMostrarAgotadas(false)}>
          <div className="mapa-agotadas-box">
            <div className="mapa-agotadas-box__emoji">🔍</div>
            <h3 className="mapa-agotadas-box__title">¡Pistas agotadas!</h3>
            <p className="mapa-agotadas-box__text">No quedan más pistas para este nivel.</p>
            <button onClick={() => setMostrarAgotadas(false)} className="mapa-agotadas-box__btn">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TriviaJuego({ categoria, onFinalizar }) {
  const preguntas = PREGUNTAS[categoria.key];
  const [indice, setIndice] = useState(0);
  const [seleccionada, setSeleccionada] = useState(null);
  const [respuestas, setRespuestas] = useState([]);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);
  const [tiempo, setTiempo] = useState(20);
  const [tiempoInicio] = useState(Date.now());
  const timerRef = useRef(null);
  const pregunta = preguntas[indice];

  const avanzar = useCallback((opcion) => {
    clearInterval(timerRef.current);
    const correcta = opcion === pregunta.correcta;
    const nuevas = [...respuestas, { correcta }];
    setRespuestas(nuevas); setSeleccionada(opcion); setMostrarRespuesta(true);
    setTimeout(() => {
      if (indice + 1 >= preguntas.length) {
        const duracion = Math.round((Date.now() - tiempoInicio) / 1000);
        onFinalizar({ correctas: nuevas.filter((r) => r.correcta).length, incorrectas: preguntas.length - nuevas.filter((r) => r.correcta).length, duracion });
      } else {
        setIndice((i) => i + 1); setSeleccionada(null); setMostrarRespuesta(false); setTiempo(20);
      }
    }, 1200);
  }, [indice, pregunta, preguntas, respuestas, tiempoInicio, onFinalizar]);

  useEffect(() => {
  setTiempo(20);

  timerRef.current = setInterval(() => {
    setTiempo((t) => {
      if (t <= 1) {
        clearInterval(timerRef.current);
        avanzar(null);
        return 0;
      }
      return t - 1;
    });
  }, 1000);

  return () => clearInterval(timerRef.current);
}, [indice, avanzar]);

  const pct = (tiempo / 20) * 100;
  const tc = tiempo > 10 ? "#4caf50" : tiempo > 5 ? "#ff9800" : "#f44336";

  return (
    <div className="trivia-juego">
      <div className="trivia-juego__topbar">
        <div className="trivia-juego__cat">
          <span>{categoria.emoji}</span>
          <span>{categoria.label}</span>
        </div>
        <div className="trivia-juego__dots">
          {preguntas.map((_, i) => (
            <div key={i} className="trivia-juego__dot" style={{ background: i < indice ? (respuestas[i]?.correcta ? "#4caf50" : "#f44336") : i === indice ? "#f7f5f0" : "rgba(247,245,240,0.18)" }} />
          ))}
        </div>
        <div style={{ position: "relative", width: 42, height: 42 }}>
          <svg width="42" height="42" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle cx="21" cy="21" r="17" fill="none" stroke={tc} strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 17}`}
              strokeDashoffset={`${2 * Math.PI * 17 * (1 - pct / 100)}`}
              strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Lora',serif", fontWeight: 700, fontSize: "0.8rem", color: tc }}>{tiempo}</div>
        </div>
      </div>

      <div className="trivia-juego__pregunta-box">
        <div className="trivia-juego__pregunta-num">Pregunta {indice + 1} de {preguntas.length}</div>
        <p className="trivia-juego__pregunta-text">{pregunta.pregunta}</p>
      </div>

      <div className="trivia-juego__opciones">
        {pregunta.opciones.map((opcion, i) => {
          let bg = "rgba(255,255,255,0.07)", border = "1px solid rgba(255,255,255,0.1)", color = "#f7f5f0";
          if (mostrarRespuesta) {
            if (i === pregunta.correcta) { bg = "rgba(76,175,80,0.18)"; border = "1px solid #4caf50"; color = "#a5d6a7"; }
            else if (i === seleccionada) { bg = "rgba(244,67,54,0.16)"; border = "1px solid #f44336"; color = "#ef9a9a"; }
            else { bg = "rgba(255,255,255,0.02)"; color = "rgba(247,245,240,0.22)"; }
          }
          return (
            <button key={i} onClick={() => !mostrarRespuesta && avanzar(i)} disabled={mostrarRespuesta}
              className="trivia-opcion"
              style={{ background: bg, border, cursor: mostrarRespuesta ? "default" : "pointer" }}
              onMouseEnter={(e) => { if (!mostrarRespuesta) e.currentTarget.style.background = "rgba(255,255,255,0.13)"; }}
              onMouseLeave={(e) => { if (!mostrarRespuesta) e.currentTarget.style.background = bg; }}>
              <span className="trivia-opcion__letra" style={{ color }}>{["A","B","C","D"][i]}</span>
              <span className="trivia-opcion__texto" style={{ color }}>{opcion}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Trivia({ user, stats, onVolver, onActualizarStats }) {
  const [pantalla, setPantalla] = useState("menu");
  const [categoria, setCategoria] = useState(null);
  const [completadas, setCompletadas] = useState({});
  const [puntajeTotal, setPuntajeTotal] = useState(0);
  const [resultadoCat, setResultadoCat] = useState(null);

  const todasCompletadas = CATEGORIAS.every((c) => completadas[c.key]);

  const handleSeleccionar = (cat) => { if (completadas[cat.key]) return; setCategoria(cat); setPantalla("jugando"); };

  const handleFinalizar = async (res) => {
    const puntosCategoria = res.correctas * 100;
    const nuevasCompletadas = { ...completadas, [categoria.key]: { correctas: res.correctas, incorrectas: res.incorrectas, puntos: puntosCategoria, duracion: res.duracion } };
    const nuevoTotal = Object.values(nuevasCompletadas).reduce((acc, c) => acc + c.puntos, 0);
    setCompletadas(nuevasCompletadas); setPuntajeTotal(nuevoTotal);
    setResultadoCat({ ...res, puntos: puntosCategoria }); setPantalla("resultado_cat");
    try {
      await api.post("/api/juegos/historial/", { categoria: categoria.key, puntos: puntosCategoria, respuestas_correctas: res.correctas, respuestas_incorrectas: res.incorrectas, duracion_segundos: res.duracion });
      onActualizarStats();
    } catch {}
  };

  const handleReiniciar = () => { setCompletadas({}); setPuntajeTotal(0); setResultadoCat(null); setCategoria(null); setPantalla("menu"); };

  const emojis = ["💪","🥉","🥈","🥇","🥇","🏆"];
  const labels = ["¡Sigue practicando!","Bien","¡Muy bien!","¡Excelente!","¡Perfecto!","¡Perfecto!"];
  const colors = ["#9e9e9e","#cd7f32","#9e9e9e","#4caf50","#f6d365","#f6d365"];
  const pctFinal = Math.round((puntajeTotal / 3000) * 100);
  const emojiFinal = pctFinal === 100 ? "🏆" : pctFinal >= 80 ? "🥇" : pctFinal >= 60 ? "🥈" : pctFinal >= 40 ? "🥉" : "💪";
  const labelFinal = pctFinal === 100 ? "¡Maestro Senderista!" : pctFinal >= 80 ? "¡Excelente resultado!" : pctFinal >= 60 ? "¡Muy bien!" : pctFinal >= 40 ? "Buen intento" : "¡Sigue practicando!";

  return (
    <div>
      <div className="trivia-header">
        <div className="trivia-header__left">
          <span style={{ fontSize: "1.6rem" }}>🧠</span>
          <div>
            <h2 className="trivia-header__title">Trivia Senderista</h2>
            <p className="trivia-header__sub">{Object.keys(completadas).length}/{CATEGORIAS.length} categorías · {puntajeTotal} pts acumulados</p>
          </div>
        </div>
        <div className="trivia-header__btns">
          {Object.keys(completadas).length > 0 && pantalla === "menu" && (
            <button onClick={handleReiniciar} className="trivia-btn-reiniciar">🔄 Reiniciar</button>
          )}
          <button onClick={onVolver} className="trivia-btn-volver">← Volver</button>
        </div>
      </div>

      {Object.keys(completadas).length > 0 && pantalla === "menu" && (
        <div className="trivia-progreso">
          <div className="trivia-progreso__top">
            <span className="trivia-progreso__label">Progreso total</span>
            <span className="trivia-progreso__pts">{puntajeTotal} / 3000 pts</span>
          </div>
          <div className="trivia-progreso__bar">
            <div className="trivia-progreso__fill" style={{ width: `${(puntajeTotal / 3000) * 100}%` }} />
          </div>
        </div>
      )}

      {pantalla === "menu" && (
        <div style={{ animation: "fadeUp 0.4s ease" }}>
          {user && stats && (
            <div className="trivia-stats">
              {[{ l: "Partidas", v: stats.total_juegos }, { l: "Mejor", v: `${stats.mejor_puntaje} pts` }, { l: "Acierto", v: `${stats.tasa_acierto}%` }].map((s) => (
                <div key={s.l} className="trivia-stats__item">
                  <div className="trivia-stats__num">{s.v}</div>
                  <div className="trivia-stats__label">{s.l}</div>
                </div>
              ))}
            </div>
          )}
          <div className="trivia-categorias">
            {CATEGORIAS.map((cat) => {
              const done = completadas[cat.key];
              return (
                <button key={cat.key} onClick={() => handleSeleccionar(cat)} disabled={!!done}
                  className="trivia-cat-btn"
                  style={{ background: done ? "rgba(76,175,80,0.12)" : "rgba(255,255,255,0.07)", border: `1px solid ${done ? "rgba(76,175,80,0.35)" : "rgba(255,255,255,0.1)"}`, cursor: done ? "default" : "pointer", opacity: done ? 0.75 : 1 }}
                  onMouseEnter={(e) => { if (!done) { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.transform = "translateY(-3px)"; } }}
                  onMouseLeave={(e) => { if (!done) { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "none"; } }}>
                  {done && <div className="trivia-cat-btn__check">✓</div>}
                  <div className="trivia-cat-btn__emoji">{cat.emoji}</div>
                  <div className="trivia-cat-btn__label">{cat.label}</div>
                  {done && <div className="trivia-cat-btn__pts" style={{ color: done.puntos === 500 ? "#f6d365" : done.puntos >= 300 ? "#4caf50" : "#9e9e9e" }}>{done.puntos} pts</div>}
                </button>
              );
            })}
          </div>
          {todasCompletadas && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button onClick={() => setPantalla("final")} className="trivia-btn-final">🏆 Ver resultado final</button>
            </div>
          )}
        </div>
      )}

      {pantalla === "jugando" && categoria && (
        <div style={{ animation: "fadeUp 0.3s ease" }}>
          <TriviaJuego categoria={categoria} onFinalizar={handleFinalizar} />
        </div>
      )}

      {pantalla === "resultado_cat" && resultadoCat && categoria && (
        <div className="trivia-resultado">
          <span className="trivia-resultado__emoji">{emojis[resultadoCat.correctas]}</span>
          <h3 className="trivia-resultado__title">{labels[resultadoCat.correctas]}</h3>
          <p className="trivia-resultado__sub">{categoria.label} · {resultadoCat.duracion}s</p>
          <div className="trivia-resultado__box">
            <div className="trivia-resultado__pts-num" style={{ color: colors[resultadoCat.correctas] }}>{resultadoCat.puntos}</div>
            <div className="trivia-resultado__pts-label">puntos esta categoría</div>
            <div className="trivia-resultado__aciertos">
              <div><div className="trivia-resultado__aciertos-num" style={{ color: "#4caf50" }}>{resultadoCat.correctas}</div><div className="trivia-resultado__aciertos-label">Correctas</div></div>
              <div className="trivia-resultado__divisor" />
              <div><div className="trivia-resultado__aciertos-num" style={{ color: "#f44336" }}>{resultadoCat.incorrectas}</div><div className="trivia-resultado__aciertos-label">Incorrectas</div></div>
            </div>
          </div>
          <div className="trivia-resultado__acumulado">
            <span className="trivia-resultado__acumulado-label">Total acumulado:</span>
            <span className="trivia-resultado__acumulado-pts">{puntajeTotal} pts</span>
            <span className="trivia-resultado__acumulado-cats">({Object.keys(completadas).length}/{CATEGORIAS.length} categorías)</span>
          </div>
          <div className="trivia-resultado__btns">
            {todasCompletadas ? (
              <button onClick={() => setPantalla("final")} className="trivia-btn-final">🏆 Ver resultado final</button>
            ) : (
              <button onClick={() => { setCategoria(null); setPantalla("menu"); }} className="trivia-btn-siguiente">Siguiente categoría →</button>
            )}
          </div>
        </div>
      )}

      {pantalla === "final" && (
        <div className="trivia-final">
          <span className="trivia-final__emoji">{emojiFinal}</span>
          <h3 className="trivia-final__title">{labelFinal}</h3>
          <p className="trivia-final__sub">Completaste las 6 categorías</p>
          <div className="trivia-final__box">
            <div className="trivia-final__pts">{puntajeTotal}</div>
            <div className="trivia-final__pts-label">puntos totales · máx 3000</div>
            <div className="trivia-final__bar-wrap">
              <div className="trivia-final__bar-fill" style={{ width: `${pctFinal}%` }} />
            </div>
            <div className="trivia-final__pct">{pctFinal}% de acierto</div>
          </div>
          <div className="trivia-final__cats">
            {CATEGORIAS.map((cat) => {
              const r = completadas[cat.key];
              return (
                <div key={cat.key} className="trivia-final__cat-item">
                  <div className="trivia-final__cat-emoji">{cat.emoji}</div>
                  <div className="trivia-final__cat-label">{cat.label}</div>
                  <div className="trivia-final__cat-pts" style={{ color: r?.puntos === 500 ? "#f6d365" : r?.puntos >= 300 ? "#4caf50" : "#9e9e9e" }}>{r?.puntos || 0}</div>
                </div>
              );
            })}
          </div>
          {!user && (
            <div className="trivia-final__login-hint">
              💡 <Link to="/login" className="trivia-final__login-link">Inicia sesión</Link> para guardar tu puntaje en el ranking
            </div>
          )}
          <button onClick={handleReiniciar} className="trivia-btn-replay">🔄 Jugar de nuevo</button>
        </div>
      )}
    </div>
  );
}

export default function Juegos() {
  const [user, setUser] = useState(null);
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [stats, setStats] = useState(null);
  const [ultimos, setUltimos] = useState([]);

  useEffect(() => { const u = localStorage.getItem("user"); if (u) try { setUser(JSON.parse(u)); } catch {} }, []);

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem("access_token"); if (!token) return;
    try { const res = await api.get("/api/juegos/estadisticas/resumen/"); setStats(res.data.estadisticas); setUltimos(res.data.ultimos_juegos); } catch {}
  }, []);

  useEffect(() => { if (user) fetchStats(); }, [user, fetchStats]);

  return (
    <div className="juegos-page">
      <Navbar />

      <div className="juegos-hero" style={{ minHeight: juegoActivo ? "auto" : "60vh" }}>
        <div className="juegos-hero__orb juegos-hero__orb--1" />
        <div className="juegos-hero__orb juegos-hero__orb--2" />
        <div className="juegos-hero__orb juegos-hero__orb--3" />

        <div className="juegos-hero__inner">
          {!juegoActivo && (
            <div className="juegos-menu">
              <div className="juegos-menu__header">
                <div className="juegos-menu__eyebrow">Zona de juegos</div>
                <h1 className="juegos-menu__title">Aprende jugando<br /><em>los senderos</em></h1>
                <p className="juegos-menu__subtitle">Dos juegos para conocer Popayán y sus rutas</p>
              </div>

              <div className="juegos-grid">
                {[
                  { key: "trivia", emoji: "🧠", titulo: "Trivia Senderista", sub: "6 categorías · 5 preguntas · 100 pts c/u", delay: "0s" },
                  { key: "mapa",   emoji: "🧩", titulo: "Mapa Roto",         sub: "Rompecabezas · 3 dificultades · 3 pistas", delay: "0.1s" },
                ].map((j) => (
                  <button key={j.key} onClick={() => setJuegoActivo(j.key)} className="juego-card"
                    style={{ animation: `fadeUp 0.5s ease ${j.delay} both` }}>
                    <div className="juego-card__emoji" style={{ animation: `float 3s ease-in-out ${j.delay} infinite` }}>{j.emoji}</div>
                    <h3 className="juego-card__title">{j.titulo}</h3>
                    <p className="juego-card__sub">{j.sub}</p>
                    <span className="juego-card__badge">Jugar →</span>
                  </button>
                ))}
              </div>

              {user && ultimos.length > 0 && (
                <div className="juegos-ultimas">
                  <p className="juegos-ultimas__label">Últimas partidas de trivia</p>
                  <div className="juegos-ultimas__list">
                    {ultimos.slice(0, 4).map((j) => {
                      const cat = CATEGORIAS.find((c) => c.key === j.categoria_key) || {};
                      return (
                        <div key={j.id} className="juegos-ultimas__item">
                          <div className="juegos-ultimas__item-left">
                            <span className="juegos-ultimas__item-emoji">{cat.emoji || "🎮"}</span>
                            <div>
                              <div className="juegos-ultimas__item-name">{j.categoria}</div>
                              <div className="juegos-ultimas__item-date">{j.fecha}</div>
                            </div>
                          </div>
                          <span className="juegos-ultimas__item-pts" style={{ color: j.puntos === 500 ? "#f6d365" : j.puntos >= 300 ? "#4caf50" : "#9e9e9e" }}>{j.puntos} pts</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {juegoActivo && (
            <div className="juego-activo-panel">
              {juegoActivo === "trivia" && <Trivia user={user} stats={stats} onVolver={() => setJuegoActivo(null)} onActualizarStats={fetchStats} />}
              {juegoActivo === "mapa"   && <MapaRoto onVolver={() => setJuegoActivo(null)} user={user} />}
            </div>
          )}
        </div>
      </div>

      {!juegoActivo && (
        <div className="juegos-info">
          <div className="juegos-info__grid">
            {[
              { emoji: "🧠", titulo: "Trivia Senderista", desc: "Pon a prueba tu conocimiento sobre rutas, equipos, seguridad, flora y fauna, técnicas y lugares icónicos del Cauca. Acumula puntos y sube en el ranking.", tags: ["6 categorías","Puntos para ranking","Historial de partidas"] },
              { emoji: "🧩", titulo: "Mapa Roto", desc: "Reconstruye los mapas de las rutas reales de Popayán pieza a pieza. Tres niveles con 9, 16 y 25 piezas. Usa tus 3 pistas sabiamente.", tags: ["Drag & Drop","3 dificultades","Rutas reales"] },
            ].map((j) => (
              <div key={j.titulo} className="juegos-info__card">
                <div className="juegos-info__card-emoji">{j.emoji}</div>
                <h3 className="juegos-info__card-title">{j.titulo}</h3>
                <p className="juegos-info__card-desc">{j.desc}</p>
                <div className="juegos-info__tags">
                  {j.tags.map((t) => <span key={t} className="juegos-info__tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}