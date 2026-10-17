/* Simulador educativo sin servicios externos: el avance se guarda solo en este navegador. */
(() => {
  "use strict";

  const STORAGE_KEY = "ciberseguro-financiero-progress-v1";
  const MODULE_IDS = ["sms", "impostors", "mfa", "https"];
  const MAX_RESPONSE_SECONDS = 30;

  // Respaldo para abrir index.html directamente con file://, donde fetch() de JSON puede estar bloqueado.
  const FALLBACK_SCENARIOS = [
    {
      id: "sms-suspension",
      type: "SMS · SUPLANTACIÓN",
      sender: "Aviso de cuenta",
      channel: "Mensaje de texto · Simulación",
      message: "Tu cuenta será suspendida hoy. Confirma tus datos para evitar el bloqueo inmediato.",
      link: "https://nequi-verificacion.example/ingresar",
      isPhishing: true,
      explanation: "Es un intento de phishing. El mensaje inventa una urgencia y el dominio no corresponde a un canal oficial. No abras el enlace ni ingreses información.",
      signals: ["Amenaza de suspensión inmediata para presionarte.", "Dominio desconocido que imita el nombre de un servicio.", "Los bancos y billeteras no deben pedirte claves o códigos por un enlace de SMS."],
      safeAction: "Abre la aplicación oficial desde tu teléfono y verifica allí."
    },
    {
      id: "pse-refund",
      type: "PSE · PAGO FALSO",
      sender: "Reembolso PSE",
      channel: "Mensaje de texto · Simulación",
      message: "Tienes un reembolso pendiente. Ingresa el código de un solo uso para recibirlo ahora.",
      link: "https://pse-reembolso.example/confirmar",
      isPhishing: true,
      explanation: "Es un engaño. Un supuesto reembolso no justifica entregar un código de un solo uso. Ese código puede permitir que otra persona autorice una operación.",
      signals: ["Promesa de dinero inesperado con límite de tiempo.", "Pide un código de autenticación fuera del flujo que iniciaste.", "El enlace usa un dominio de ejemplo, no un portal oficial."],
      safeAction: "No compartas el código. Consulta la transacción desde el sitio o la app oficial."
    },
    {
      id: "daviplata-prize",
      type: "DAVIPLATA · PREMIO FALSO",
      sender: "Beneficio para ti",
      channel: "Mensaje de texto · Simulación",
      message: "¡Ganaste un bono! Para reclamarlo, registra tu número de tarjeta y la clave de tu billetera.",
      link: "https://bono-daviplata.example/reclamar",
      isPhishing: true,
      explanation: "Es phishing. Los premios inesperados suelen usarse como gancho para obtener datos financieros. Ninguna promoción legítima necesita tu clave de acceso.",
      signals: ["Premio no solicitado.", "Solicita una clave financiera para entregar el supuesto beneficio.", "La dirección no es un canal oficial."],
      safeAction: "Busca promociones escribiendo tú mismo la dirección oficial o dentro de la app."
    },
    {
      id: "bank-receipt",
      type: "BANCO · AVISO INFORMATIVO",
      sender: "Notificación de tu app bancaria",
      channel: "Notificación dentro de la aplicación · Simulación",
      message: "Compra aprobada por $24.900 en COMERCIO DEMO. Si no reconoces el movimiento, abre la app oficial para revisar y reportar la operación. Este aviso no incluye enlaces ni solicita códigos.",
      link: null,
      isPhishing: false,
      explanation: "Este aviso simulado no pide que respondas, compartas una clave o abras un enlace. Aun así, las notificaciones pueden falsificarse: comprueba el movimiento entrando por tu cuenta a la app oficial.",
      signals: ["No incluye un enlace externo ni solicita credenciales.", "La recomendación es abrir la aplicación por separado.", "Si no reconoces la compra, contacta al banco desde un canal oficial."],
      safeAction: "Verifica el movimiento en la app oficial; no uses datos de contacto de mensajes dudosos."
    },
    {
      id: "nequi-security",
      type: "BILLETERA · ALERTA DE SEGURIDAD",
      sender: "Alerta en la app",
      channel: "Notificación dentro de la aplicación · Simulación",
      message: "Se activó la verificación biométrica que configuraste desde los ajustes de seguridad. Si no hiciste este cambio, entra directamente a la app y comunícate con soporte desde allí. No respondas a este aviso.",
      link: null,
      isPhishing: false,
      explanation: "En este escenario de práctica, el aviso informa sobre un cambio iniciado por la persona usuaria y no solicita datos ni conduce a un enlace. Si tú no hiciste el cambio, trátalo como una alerta y verifica directamente en la app.",
      signals: ["El escenario indica que el cambio fue iniciado desde los ajustes.", "No pide claves, token ni datos de tarjeta.", "Una alerta inesperada debe verificarse desde la app oficial, no respondiendo al mensaje."],
      safeAction: "Confirma si tú hiciste el cambio. Si no, usa el soporte oficial dentro de la app."
    },
    {
      id: "bancolombia-token",
      type: "BANCOS · ROBO DE TOKEN",
      sender: "Asesor de seguridad",
      channel: "Llamada o chat inesperado · Simulación",
      message: "Soy del área de seguridad. Para cancelar una transferencia sospechosa, dime el código que acaba de llegar a tu celular. No cuelgues o perderás el dinero.",
      link: null,
      isPhishing: true,
      explanation: "Es una señal clara de fraude. Un código de un solo uso sirve para autorizar o recuperar el acceso: nunca lo compartas, ni siquiera con alguien que afirma ser del banco.",
      signals: ["Solicita un token recibido en tu teléfono.", "Usa presión y miedo para evitar que verifiques.", "La identidad del remitente o interlocutor puede ser falsificada."],
      safeAction: "Cuelga y llama al número publicado en la tarjeta o en el sitio oficial del banco."
    }
  ];

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    summary: $("#progress-summary"),
    score: $("#score-summary"),
    scenarioCounter: $("#scenario-counter"),
    progressBar: $("#quiz-progress-bar"),
    type: $("#scenario-type"),
    number: $("#scenario-number"),
    sender: $("#scenario-sender"),
    channel: $("#scenario-channel"),
    avatar: $("#sender-avatar"),
    message: $("#scenario-message"),
    link: $("#scenario-link"),
    decisionLabel: $("#decision-label"),
    decisions: $("#decision-buttons"),
    phishingButton: $("#choose-phishing"),
    safeButton: $("#choose-safe"),
    feedback: $("#feedback-panel"),
    feedbackIcon: $("#feedback-icon"),
    feedbackTitle: $("#feedback-title"),
    feedbackResult: $("#feedback-result"),
    explanation: $("#feedback-explanation"),
    signals: $("#feedback-signals"),
    nextButton: $("#next-scenario"),
    error: $("#scenario-error"),
    menuToggle: $("#menu-toggle"),
    nav: $("#main-nav"),
    certificateDialog: $("#certificate-dialog"),
    certificateName: $("#certificate-name"),
    certificateDate: $("#certificate-date"),
    certificateScore: $("#certificate-score"),
    toast: $("#toast")
  };

  let scenarios = [];
  let currentIndex = 0;
  let scenarioStartedAt = 0;
  let toastTimeout;
  const savedProgress = loadProgress();
  let moduleProgress = new Set(savedProgress.modules);
  let answers = savedProgress.answers;

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        modules: Array.isArray(saved.modules) ? saved.modules.filter((id) => MODULE_IDS.includes(id)) : [],
        answers: Array.isArray(saved.answers) ? saved.answers : []
      };
    } catch {
      return { modules: [], answers: [] };
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ modules: [...moduleProgress], answers }));
    } catch {
      showToast("No se pudo guardar el avance en este navegador; puedes continuar practicando.");
    }
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => elements.toast.classList.remove("show"), 3600);
  }

  function getScore() {
    if (!scenarios.length) return 0;
    const earned = answers.reduce((sum, answer) => sum + (answer && Number.isFinite(answer.points) ? answer.points : 0), 0);
    return Math.min(100, Math.round(earned));
  }

  function updateProgress() {
    const answeredCount = answers.filter(Boolean).length;
    const completed = Math.min(10, moduleProgress.size + answeredCount);
    elements.summary.textContent = `${completed}/10 retos completados`;
    elements.score.textContent = `${getScore()}/100`;
    if (scenarios.length) {
      elements.scenarioCounter.textContent = `${answeredCount}/${scenarios.length} casos`;
      elements.progressBar.style.width = `${(answeredCount / scenarios.length) * 100}%`;
    }
    document.querySelectorAll(".module-complete").forEach((button) => {
      const done = moduleProgress.has(button.dataset.module);
      const card = button.closest(".module-card");
      button.textContent = done ? "✓ Guía completada" : "Marcar guía como leída";
      button.setAttribute("aria-pressed", String(done));
      card.classList.toggle("is-complete", done);
    });
  }

  function makeFeedbackIcon(name) {
    elements.feedbackIcon.replaceChildren();
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", name);
    icon.setAttribute("aria-hidden", "true");
    elements.feedbackIcon.append(icon);
    if (window.lucide) window.lucide.createIcons({ root: elements.feedbackIcon });
  }

  function renderFeedback(answer, scenario) {
    elements.feedback.hidden = false;
    elements.decisions.hidden = true;
    elements.decisionLabel.hidden = true;
    elements.feedbackTitle.textContent = answer.correct ? "¡Muy bien! Identificaste la señal." : "Este caso merece una segunda mirada.";
    elements.feedbackResult.textContent = answer.correct ? `Respuesta correcta · +${Math.round(answer.points)} puntos` : "Respuesta incorrecta · revisa estas señales";
    elements.explanation.textContent = `${scenario.explanation} ${scenario.safeAction}`;
    elements.signals.replaceChildren();
    scenario.signals.forEach((signal) => {
      const item = document.createElement("li");
      item.textContent = signal;
      elements.signals.append(item);
    });
    makeFeedbackIcon(answer.correct ? "circle-check" : "book-open-check");
    const isLast = currentIndex === scenarios.length - 1;
    elements.nextButton.innerHTML = isLast
      ? 'Ver resultados <i data-lucide="award" aria-hidden="true"></i>'
      : 'Siguiente reto <i data-lucide="arrow-right" aria-hidden="true"></i>';
    if (window.lucide) window.lucide.createIcons({ root: elements.nextButton });
    elements.nextButton.focus({ preventScroll: true });
  }

  function renderScenario() {
    if (!scenarios.length) return;
    if (currentIndex >= scenarios.length) {
      renderCompletion();
      return;
    }
    const scenario = scenarios[currentIndex];
    elements.error.hidden = true;
    elements.feedback.hidden = true;
    elements.decisions.hidden = false;
    elements.decisionLabel.hidden = false;
    elements.phishingButton.disabled = false;
    elements.safeButton.disabled = false;
    elements.type.textContent = scenario.type;
    elements.number.textContent = `RETO ${currentIndex + 1} DE ${scenarios.length}`;
    elements.sender.textContent = scenario.sender;
    elements.channel.textContent = scenario.channel;
    elements.avatar.textContent = scenario.sender.trim().charAt(0).toUpperCase();
    elements.message.textContent = scenario.message;
    const linkText = elements.link.querySelector("span");
    if (scenario.link) {
      linkText.textContent = scenario.link;
      elements.link.hidden = false;
    } else {
      linkText.textContent = "";
      elements.link.hidden = true;
    }
    scenarioStartedAt = performance.now();
    updateProgress();
    const previousAnswer = answers[currentIndex];
    if (previousAnswer) {
      elements.phishingButton.disabled = true;
      elements.safeButton.disabled = true;
      renderFeedback(previousAnswer, scenario);
      elements.nextButton.focus({ preventScroll: true });
    } else {
      elements.phishingButton.focus({ preventScroll: true });
    }
  }

  function chooseAnswer(choiceIsPhishing) {
    if (answers[currentIndex]) return;
    const scenario = scenarios[currentIndex];
    const seconds = Math.max(0, (performance.now() - scenarioStartedAt) / 1000);
    const correct = choiceIsPhishing === scenario.isPhishing;
    // 80% del puntaje mide aciertos; hasta 20% premia una decisión oportuna (tope: 30 s).
    const speedFactor = Math.max(0, 1 - seconds / MAX_RESPONSE_SECONDS);
    const points = correct ? (80 / scenarios.length) + (20 / scenarios.length) * speedFactor : 0;
    answers[currentIndex] = { choiceIsPhishing, correct, seconds, points };
    saveProgress();
    updateProgress();
    elements.phishingButton.disabled = true;
    elements.safeButton.disabled = true;
    renderFeedback(answers[currentIndex], scenario);
  }

  function renderCompletion() {
    const score = getScore();
    elements.type.textContent = "SIMULADOR COMPLETADO";
    elements.number.textContent = `${answers.filter(Boolean).length} DE ${scenarios.length} RETOS`;
    elements.sender.textContent = "¡Terminaste la práctica!";
    elements.channel.textContent = "Tu resultado se guarda únicamente en este navegador.";
    elements.avatar.textContent = "✓";
    elements.message.textContent = `Tu puntaje es ${score}/100. ${score >= 80 ? "¡Alcanzaste el nivel para obtener tu certificado!" : "Repasa las guías y vuelve a practicar para alcanzar 80 puntos."}`;
    elements.link.hidden = true;
    elements.decisionLabel.hidden = true;
    elements.decisions.hidden = true;
    elements.feedback.hidden = false;
    elements.feedbackTitle.textContent = score >= 80 ? "¡Felicitaciones, usuario/a digital seguro/a!" : "Buen trabajo por completar los retos.";
    elements.feedbackResult.textContent = `Puntaje final: ${score}/100`;
    elements.explanation.textContent = score >= 80
      ? "Puedes personalizar e imprimir tu certificado. Sigue verificando desde canales oficiales y nunca compartas códigos de seguridad."
      : "Tu resultado está por debajo de 80 puntos. Revisa las señales explicadas en cada reto y vuelve a intentarlo.";
    elements.signals.replaceChildren();
    makeFeedbackIcon(score >= 80 ? "award" : "book-open-check");
    elements.nextButton.textContent = score >= 80 ? "Abrir mi certificado" : "Reintentar los retos";
    elements.nextButton.disabled = false;
    elements.nextButton.focus({ preventScroll: true });
    updateProgress();
  }

  function openCertificate() {
    elements.certificateDate.textContent = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date());
    elements.certificateScore.textContent = `${getScore()}/100`;
    elements.certificateName.value = "";
    elements.certificateDialog.showModal();
    elements.certificateName.focus();
  }

  function advanceOrFinish() {
    if (currentIndex < scenarios.length - 1) {
      currentIndex += 1;
      renderScenario();
      return;
    }
    currentIndex = scenarios.length;
    renderCompletion();
    if (getScore() >= 80) openCertificate();
  }

  async function loadScenarios() {
    try {
      const response = await fetch("scenarios.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data) || data.length !== 6 || data.some((item) => !item.id || typeof item.isPhishing !== "boolean")) {
        throw new Error("Formato de escenarios no válido");
      }
      scenarios = data;
    } catch (error) {
      scenarios = FALLBACK_SCENARIOS;
      showToast("Se cargó el respaldo de escenarios; para usar scenarios.json, publica el sitio o ábrelo desde un servidor estático.");
      console.info("Usando escenarios de respaldo:", error.message);
    }
    answers = answers.slice(0, scenarios.length);
    // El índice se calcula a partir de las respuestas conservadas para evitar saltar retos pendientes.
    currentIndex = answers.findIndex((answer) => !answer);
    if (currentIndex < 0) currentIndex = answers.length;
    if (currentIndex >= scenarios.length) {
      renderCompletion();
    } else {
      renderScenario();
    }
    updateProgress();
  }

  document.querySelectorAll(".module-complete").forEach((button) => {
    button.addEventListener("click", () => {
      const moduleId = button.dataset.module;
      if (moduleProgress.has(moduleId)) moduleProgress.delete(moduleId);
      else moduleProgress.add(moduleId);
      saveProgress();
      updateProgress();
      showToast(moduleProgress.has(moduleId) ? "Guía marcada como completada." : "Guía retirada de tus retos completados.");
    });
  });

  elements.phishingButton.addEventListener("click", () => chooseAnswer(true));
  elements.safeButton.addEventListener("click", () => chooseAnswer(false));
  elements.nextButton.addEventListener("click", () => {
    if (currentIndex >= scenarios.length) {
      if (getScore() >= 80) openCertificate();
      else {
        answers = [];
        currentIndex = 0;
        saveProgress();
        renderScenario();
      }
      return;
    }
    advanceOrFinish();
  });

  elements.menuToggle.addEventListener("click", () => {
    const expanded = elements.menuToggle.getAttribute("aria-expanded") === "true";
    elements.menuToggle.setAttribute("aria-expanded", String(!expanded));
    elements.menuToggle.setAttribute("aria-label", expanded ? "Abrir menú" : "Cerrar menú");
    elements.nav.classList.toggle("is-open", !expanded);
  });
  elements.nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    elements.nav.classList.remove("is-open");
    elements.menuToggle.setAttribute("aria-expanded", "false");
    elements.menuToggle.setAttribute("aria-label", "Abrir menú");
  }));

  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => elements.certificateDialog.close()));
  elements.certificateDialog.addEventListener("click", (event) => {
    if (event.target === elements.certificateDialog) elements.certificateDialog.close();
  });
  $("#print-certificate").addEventListener("click", () => {
    const enteredName = elements.certificateName.value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 60);
    const nameNode = document.createElement("p");
    nameNode.className = "certificate-recipient";
    nameNode.textContent = enteredName || "Usuario/a";
    const existing = $(".certificate-recipient");
    if (existing) existing.remove();
    $("#certificate-heading").after(nameNode);
    window.print();
  });

  if (window.lucide) window.lucide.createIcons();
  updateProgress();
  loadScenarios();
})();
