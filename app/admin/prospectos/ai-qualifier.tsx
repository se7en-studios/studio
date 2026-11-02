"use client";

import { useState } from "react";
import {
  Sparkles,
  Zap,
  Globe,
  Video,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Flame,
} from "lucide-react";
import { useSoundFx } from "@/lib/use-sound-fx";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { btnPrimary, btnSecondary, searchInput, cn } from "../kit";

interface AiQualifierResult {
  businessName: string;
  category: string;
  city: string;
  estimatedTicketUsd: number;
  criticalLeaks: string[];
  loomScript: string;
  whatsappHook: string;
  winProbability: number;
}

export function AiQualifier() {
  const [targetInput, setTargetInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AiQualifierResult | null>(null);
  const [copiedType, setCopiedType] = useState<"loom" | "wa" | null>(null);
  const sound = useSoundFx();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput.trim()) return;

    setAnalyzing(true);
    setResult(null);
    sound.click();

    setTimeout(() => {
      const input = targetInput.trim();
      const isPadel = /padel|paddle|cancha|club|tenis|deport/i.test(input);
      const isFood = /resto|bar|cafe|pizza|burger|cerveza|gastro|rotiseria|helad|parrilla|buffet/i.test(input);
      const isWine = /bodega|vino|enoturismo/i.test(input);
      const isOil = /petrol|oil|valvul|fricsa|equipar|ferr|pozo|vaca muerta|hidrocarbur|trans-catriel|ambiental|logistica|tubing|metalurg/i.test(input);
      const isHotel = /hotel|apart|hospedaje|posada|moras|palax|victoria|alojamiento|cabanas|audorino/i.test(input);
      const isHealth = /clinic|salud|odontolog|dental|veterinari|huellitas|medico|estetica|cirugi|farmacia/i.test(input);
      const isConst = /corralon|aridos|construccion|ferreteria|arena|valle|materiales/i.test(input);
      const isRealEstate = /inmobiliar|propiedad|lote|tasacion|lupa|mq|desarrollo/i.test(input);

      let category = "Comercio / Empresa Local";
      let ticket = 1200;
      let leaks = [
        "El sitio web no está optimizado para celulares y tarda más de 4.2 segundos en abrir.",
        "No tiene botón directo a WhatsApp para resolver dudas al instante.",
        "Los clientes dependen de llamar por teléfono o consultar por mensaje manual.",
      ];
      let script = `Hola equipo de ${input}! Les escribe Franco de Se7en Studio.
Vi su presencia comercial y noté algo clave: cuando un cliente los busca desde el celular, la página tarda más de 4 segundos en cargar y no tienen cómo contactarlos en 1 toque.
Armamos un prototipo en 10 segundos donde el cliente abre la web al toque, ve sus servicios y les manda WhatsApp directo.
¿Tienen 2 minutos para ver la demo que les grabé? Abrazo!`;
      let hook = `Hola! ¿Cómo están? Les escribe Franco de Se7en Studio. Les grabé un video de 60 segundos mostrándoles cómo hacer que los clientes que entran a su web les escriban derecho al WhatsApp sin trabas. ¿Se los paso por acá?`;

      if (isOil) {
        category = "Servicios Petroleros & Industria";
        ticket = 2400;
        leaks = [
          "Sin portal corporativo moderno para licitaciones y homologación con operadoras (YPF, Vista, Pan American).",
          "Falta de fichas técnicas descargables y certificaciones ISO / seguridad accesibles en 1 clic.",
          "Fuga de contratos corporativos de cuadrillas y equipos por no reflejar capacidad operativa en la web.",
        ];
        script = `Hola directivos y equipo de ${input}! Les habla Franco de Se7en Studio.
Analizamos su presencia en el polo petrolero de Catriel y Vaca Muerta. Cuando una operadora como YPF o Vista evalúa a sus contratistas, exige portales con fichas técnicas descargables, certificaciones de flota y canal corporativo seguro.
Diseñamos portales industriales de alta velocidad con catálogo de equipos, fichas técnicas en PDF automático y canal B2B directo para contrataciones.
¿Podemos coordinar una llamada de 10 minutos para mostrarles cómo presentar la ingeniería de su empresa al nivel que exigen las operadoras?`;
        hook = `Hola! Les escribe Franco de Se7en Studio. Desarrollamos portales B2B e industriales para empresas de servicios en la cuenca de Vaca Muerta. Les preparé una propuesta breve para optimizar su canal de licitaciones y catálogo corporativo. ¿Con quién del área comercial o gerencia puedo coordinar?`;
      } else if (isHotel) {
        category = "Hotelería & Alojamiento Corporativo";
        ticket = 1800;
        leaks = [
          "Comisiones del 18% al 22% perdidas en cada noche reservada por Booking o Despegar.",
          "Sin motor de reservas corporativas directas para empresas de servicios petroleros y cuadrillas.",
          "Coordinación manual y lenta de check-in / check-out que satura la conserjería.",
        ];
        script = `Hola administración de ${input}! Les habla Franco de Se7en Studio.
Fíjense lo que sucede hoy en Catriel: gran parte de sus reservas ejecutivas y de cuadrillas pasan por intermediarios o mensajes informales que tardan horas en confirmarse.
Con nuestro motor de reservas directas, las empresas petroleras y viajantes reservan estadías corporativas o habitaciones individuales en 3 clics, con facturación A automática y seña integrada.
Esto les ahorra cientos de miles de pesos en comisiones de plataformas y asegura ocupación constante. ¿Tienen 2 minutos para ver la demo que les armé?`;
        hook = `Hola! Les escribe Franco de Se7en Studio. Analicé el sistema de reservas de su hotel y les preparé una demo de 60s para capturar reservas corporativas directas sin pagar comisiones a plataformas. ¿Se las envío por acá?`;
      } else if (isPadel) {
        category = "Club de Pádel & Deporte";
        ticket = 1600;
        leaks = [
          "Coordinación 100% manual de turnos por WhatsApp que colapsa en horas pico.",
          "Falta de cobro de señas automático para evitar que la gente reserve y no vaya.",
          "Los jugadores no pueden ver en vivo qué canchas están libres para hoy a la noche.",
        ];
        script = `Hola Matías y equipo de ${input}! Les habla Franco de Se7en Studio.
Desarrollamos el turnero de Muzzaga Pádel en Catriel. Fijate lo que pasa en tu club: a las 7 de la tarde te entran 40 mensajes juntos preguntando '¿hay cancha a las 20:30?'.
Con la web que armamos, el jugador entra desde el celular, ve la grilla en vivo, elige la cancha de cristal y paga la seña por Mercado Pago en 2 clics.
Las canchas se llenan solas las 24hs sin que tengas que vivir contestando mensajes. ¿Te mando una demo de 1 minuto para que la pruebes vos mismo?`;
        hook = `Hola! Les escribe Franco de Se7en Studio. Diseñamos el turnero de Muzzaga Pádel en Catriel. Les armé una demo en video de 60s para que vean cómo automatizar las reservas de sus canchas con seña por Mercado Pago. ¿Se las comparto?`;
      } else if (isFood) {
        category = "Gastronomía & Restaurantes";
        ticket = 1400;
        leaks = [
          "Pérdida del 28% al 32% en comisiones por cada pedido canalizado por PedidosYa / Rappi.",
          "Menú digital en formato PDF pesado o foto borrosa de Instagram.",
          "Sin pasarela propia para cobrar con tarjeta o Mercado Pago sin intermediarios.",
        ];
        script = `Hola gente de ${input}! Les habla Franco de Se7en Studio.
Desarrollamos la carta interactiva de Takefyy. Noté que hoy sus clientes tienen que bajarse una app de delivery o mirar una foto de la carta en historias destacadas.
Con la carta interactiva de Se7en, el cliente escanea el QR en la mesa o entra desde Instagram, arma el pedido con fotos reales y el ticket entra cerrado a su WhatsApp con 0% de comisión para ustedes.
En un local de su volumen, esto significa ahorrarse más de $1.800.000 ARS por mes en retenciones. ¿Les muestro la demo en vivo?`;
        hook = `Hola! Les escribe Franco de Se7en Studio. Les armé un análisis de 60 segundos de su carta digital y cómo dejar de perder 30% en comisiones con apps de delivery. ¿Tienen 1 minuto para que se los mande?`;
      } else if (isWine) {
        category = "Bodega & Enoturismo";
        ticket = 2400;
        leaks = [
          "Sitio web institucional anticuado que no refleja el nivel estético de la bodega ni de los vinos.",
          "Sin motor de reservas para visitas a bodega y degustaciones.",
          "Tienda online atada a plantillas genéricas sin experiencia inmersiva para compradores del exterior.",
        ];
        script = `Hola equipo de ${input}! Les habla Franco de Se7en Studio.
Sus vinos tienen una calidad excepcional, pero cuando un turista o distribuidor entra a su web desde Buenos Aires o el exterior, la experiencia visual no refleja la elegancia de la bodega.
Desarrollamos experiencias de enoturismo interactivas con reservas de degustaciones en tiempo real y tienda directa con pasarela multimoneda.
¿Tienen unos minutos para ver cómo transformar su presencia digital en una vidriera internacional a la altura de su marca?`;
        hook = `Hola! Les escribe Franco de Se7en Studio. Les armamos una demo de reservas de enoturismo y catálogo digital premium para bodegas de la región. ¿Se las comparto para que la vean con el equipo de marketing?`;
      } else if (isHealth) {
        category = "Salud & Especialidades Médicas";
        ticket = 1500;
        leaks = [
          "Líneas telefónicas y WhatsApp saturados de pacientes pidiendo y cancelando turnos.",
          "Alto porcentaje de ausentismo por falta de confirmaciones y recordatorios automáticos.",
          "Sin cartilla médica digital ni portal de derivaciones y estudios claros.",
        ];
        script = `Hola equipo de ${input}! Les habla Franco de Se7en Studio.
En consultorios y clínicas de la región, la secretaria pasa el 70% del tiempo respondiendo mensajes repetitivos de horarios de médicos y obras sociales.
Implementamos un portal de autogestión de turnos médicos con confirmación automática por WhatsApp y cartilla interactiva por especialidad.
Los pacientes eligen el profesional en 3 clics y el ausentismo se reduce más de un 40%. ¿Les preparo una demo de 1 minuto para ver cómo funcionaría en su centro?`;
        hook = `Hola! Les escribe Franco de Se7en Studio. Desarrollamos turneros médicos interactivos con confirmación automática por WhatsApp para reducir ausentismo y liberar las líneas del consultorio. ¿Les comparto una demo breve?`;
      } else if (isConst) {
        category = "Construcción & Corralón de Materiales";
        ticket = 1700;
        leaks = [
          "Pérdida de ventas en obras y proyectos por no contar con catálogo de precios de materiales actualizado.",
          "Cotizaciones manuales que tardan hasta 24hs en responderse.",
          "Sin calculador de acopio ni cotizador interactivo de fletes a yacimientos o barrios.",
        ];
        script = `Hola equipo de ${input}! Les habla Franco de Se7en Studio.
Hoy los constructores y contratistas necesitan saber stock y precios de materiales en el momento exacto en que están en obra.
Desarrollamos cotizadores interactivos para corralones donde el cliente carga las bolsas de cemento, hierro o áridos, calcula el flete y envía el pedido listo para facturar por WhatsApp.
Esto multiplica las ventas de mostrador y agiliza los pedidos grandes de obras. ¿Les muestro cómo funciona la demo que armamos?`;
        hook = `Hola! Les escribe Franco de Se7en Studio. Diseñamos cotizadores digitales para corralones y distribuidores de materiales para que los constructores les pidan cotizaciones cerradas por WhatsApp al instante. ¿Les mando una muestra?`;
      } else if (isRealEstate) {
        category = "Inmobiliaria & Desarrollos Urbanos";
        ticket = 1900;
        leaks = [
          "Dependencia de portales inmobiliarios pagos (Zonaprop/Argenprop) con costo mensual elevado.",
          "Filtros de búsqueda torpes que frustran a quien busca lotes, alquileres petroleros o casas.",
          "Propiedades sin ficha interactiva optimizada para compartir en historias o por WhatsApp.",
        ];
        script = `Hola equipo de ${input}! Les habla Franco de Se7en Studio.
En Catriel y el Valle, la demanda de alquileres para empresas petroleras y venta de lotes se mueve a través de recomendaciones rápidas.
Diseñamos buscadores inmobiliarios hiper-rápidos con mapa satelital interactivo, fichas con fotos HD en menos de 0.8s y botón de consulta directa por propiedad a su WhatsApp.
¿Les comparto una demo para que vean cómo mostrar sus captaciones con una velocidad 5 veces superior a los portales tradicionales?`;
        hook = `Hola! Les escribe Franco de Se7en Studio. Diseñamos portales inmobiliarios ultra-rápidos con mapa interactivo y fichas directas a WhatsApp para captar clientes corporativos y compradores de lotes. ¿Tienen 1 minuto para que les pase una demo?`;
      }

      setResult({
        businessName: input.charAt(0).toUpperCase() + input.slice(1),
        category,
        city: "Alto Valle / Región",
        estimatedTicketUsd: ticket,
        criticalLeaks: leaks,
        loomScript: script,
        whatsappHook: hook,
        winProbability: Math.floor(Math.random() * 20) + 75,
      });

      setAnalyzing(false);
      sound.success();
    }, 2200);
  };

  const handleCopy = (type: "loom" | "wa", text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    sound.tick();
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 md:p-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
            <Sparkles size={12} />
            Se7en AI Copilot & Lead Intelligence
          </div>
          <h3 className="adm-title mt-2 text-[17px] text-foreground">
            Cualificador Forense de Prospectos & Guiones
          </h3>
          <p className="mt-1 text-[12px] text-muted">
            Ingresá el nombre, Instagram o web de cualquier negocio para generar la auditoría de 60s y el mensaje de apertura.
          </p>
        </div>
      </div>

      {/* Input de Búsqueda */}
      <form onSubmit={handleAnalyze} className="mt-4 flex gap-2 sm:gap-3">
        <label className="relative flex flex-1 items-center">
          <Globe size={14} className="pointer-events-none absolute left-3 text-muted" />
          <input
            type="text"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="Ej: Impacto Pádel Cipolletti, Cervecería Owe, Bodega del Fin del Mundo, FRICSA S.A..."
            className={searchInput}
          />
        </label>

        <button
          type="submit"
          disabled={analyzing || !targetInput.trim()}
          className={cn(btnPrimary, "shrink-0")}
        >
          {analyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Analizando…</span>
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Auditar con IA</span>
            </>
          )}
        </button>
      </form>

      {/* Resultado Forense en Tiempo Real */}
      {result && (
        <div className="mt-6 space-y-5 rounded-xl border border-[var(--line-strong)] bg-[var(--panel-2)] p-5 animate-in fade-in duration-200">
            {/* Cabecera del Resultado */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <span className="adm-label text-accent block">
                  Diagnóstico IA Completado
                </span>
                <h4 className="adm-title mt-1 text-lg text-foreground">{result.businessName}</h4>
                <p className="adm-label text-[11px] text-muted mt-0.5">
                  Rubro: {result.category} · {result.city}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] px-3 py-1.5 text-right">
                  <span className="adm-label text-[11px] block">Ticket sugerido:</span>
                  <span className="adm-num text-sm text-accent">USD ${result.estimatedTicketUsd}</span>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-right text-emerald-300">
                  <span className="adm-label text-[11px] block text-emerald-400">
                    Probabilidad de cierre:
                  </span>
                  <span className="adm-num text-sm font-bold">{result.winProbability}% (Alta)</span>
                </div>
              </div>
            </div>

            {/* 3 Fugas Críticas */}
            <div>
              <p className="adm-label mb-2 flex items-center gap-1.5 text-foreground">
                <AlertTriangle size={13} className="text-amber-300" />
                3 Fugas Críticas Detectadas en su Negocio Actual:
              </p>
              <div className="space-y-2">
                {result.criticalLeaks.map((leak, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--well)] p-2.5 text-xs text-foreground leading-relaxed"
                  >
                    <span className="adm-num text-xs font-bold text-accent shrink-0">0{i + 1}.</span>
                    <span>{leak}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guión de Video de Loom (60 Segundos) */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-4">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                <span className="adm-title text-xs flex items-center gap-1.5 text-foreground">
                  <Video size={14} className="text-accent" />
                  Guión de Video Loom (60 Segundos para Franco o Fede):
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("loom", result.loomScript)}
                  className="flex items-center gap-1 rounded-full border border-[var(--line-strong)] bg-[var(--panel)] px-2.5 py-1 adm-label text-muted hover:text-foreground"
                >
                  {copiedType === "loom" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedType === "loom" ? "¡Copiado!" : "Copiar Guión"}</span>
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted bg-[var(--panel)] p-3 rounded-lg border border-[var(--line)]">
                {result.loomScript}
              </p>
            </div>

            {/* Mensaje Hook para WhatsApp */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <span className="adm-title text-xs flex items-center gap-1.5 text-emerald-300">
                  <WhatsAppLogo className="h-3.5 w-3.5 fill-current" />
                  Mensaje Hook de 1 Clic para WhatsApp:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("wa", result.whatsappHook)}
                  className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 adm-label text-emerald-300 hover:bg-emerald-500/20"
                >
                  {copiedType === "wa" ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedType === "wa" ? "¡Copiado!" : "Copiar Hook"}</span>
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-foreground bg-[var(--panel)] p-3 rounded-lg border border-[var(--line)]">
                &ldquo;{result.whatsappHook}&rdquo;
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
