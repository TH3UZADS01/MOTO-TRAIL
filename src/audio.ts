import { ENGINE_TUNING, type Powertrain } from "./powertrain";

import { DISCOVERY_SOUND_DURATION } from "./exploration";

import type { RemotePlayer } from "./network";

import { getVehicle, type VehicleId } from "./vehicles";

// High-RPM recordings supplied by the user; gains, pitch range and crossfade are tunable.

// Marcha lenta compartilhada por motos com o mesmo ronco base.
// Pop e Cub usam pop-idle.wav. O volume padrao de todos os WAVs idle e 0.85.
// Arquivos opcionais: se ausentes, mantem-se o som anterior.
export const GENERIC_IDLE_AUDIO_TUNING = {
  idleGain: 0.85,
  idlePlaybackRate: 1.0,
  idleFadeStart: 0.02,
  idleFadeEnd: 0.18,
};

export const CG_AUDIO_TUNING = {
  accelerationGain: 0.45,
  coastGain: 0.4,
  coastIdleGain: 0.12, // volume do loop off-high, independente do WAV de marcha lenta
  idleGain: 0.85,
  minRate: 0.65,
  maxRate: 1.1,
  response: 0.16,
  filter: 7000,
  idlePlaybackRate: 1.0,
  idleFadeStart: 0.02,
  idleFadeEnd: 0.18,
};

export const SAHARA_AUDIO_TUNING = {
  accelerationGain: 0.9,

  coastGain: 0.4,

  coastIdleGain: 0.2,
  idleGain: 0.85,

  minRate: 0.85,

  maxRate: 1.5,

  response: 0.16,

  filter: 15000,
  // Velocidade do arquivo WAV exclusivo de marcha lenta.
  idlePlaybackRate: 1.0,
  // Intervalo normalizado do RPM em que o som de marcha lenta perde destaque.
  idleFadeStart: 0.02,
  idleFadeEnd: 0.18,
};

export const AUDIO_ASSETS = [
  { name: "engine-idle", bank: "engine", load: false },
  { name: "engine-load", bank: "engine", load: true },

  { name: "moped-idle", bank: "moped", load: false },
  { name: "moped-load", bank: "moped", load: true },

  { name: "wind", bank: "wind", load: false },
  { name: "cg150-on-high", bank: "cg150", load: true },

  { name: "cg150-off-high", bank: "cg150", load: false },

  { name: "sahara-on-high", bank: "sahara", load: true },
  { name: "sahara-off-high", bank: "sahara", load: false },
] as const;

type AudioBank = "engine" | "moped" | "wind" | "cg150" | "sahara";
type IdleSoundName = "pop-idle" | "cg150-idle" | "caloi-idle" | "sahara-idle";
type Layer = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  bank: AudioBank;
  load: boolean;
  idle: boolean;
  idleSound?: IdleSoundName;
};

// Os bancos existentes continuam iguais: nenhuma moto ou arquivo de aceleracao e alterado.
// Associacao por banco para aproveitar gravacoes compartilhadas.
const IDLE_SOUND_BY_BANK: Partial<Record<AudioBank, IdleSoundName>> = {
  engine: "pop-idle",
  moped: "caloi-idle",
  cg150: "cg150-idle",
  sahara: "sahara-idle",
};

function idleSoundForVehicle(
  vehicleId: VehicleId,
  bank: AudioBank,
): IdleSoundName | undefined {
  // Garante Pop + Cub com um unico audio, independentemente do identificador de banco.
  const id = String(vehicleId);
  if (id === "pop" || id === "cub") return "pop-idle";
  if (id === "caloi") return "caloi-idle";
  return IDLE_SOUND_BY_BANK[bank];
}

type Position = { x: number; y: number; z: number };

type RemoteVoice = {
  gain: GainNode;
  pan: StereoPannerNode;
  horns: Set<AudioBufferSourceNode>;
  stopHorn?: () => void;
};

export class Sound {
  private output?: DynamicsCompressorNode;
  private effectsOutput?: GainNode;
  private effectVolume = 0.5;

  get effects() {
    return this.effectVolume;
  }

  set effects(value: number) {
    this.effectVolume = Math.max(0, Math.min(1, value));
    if (this.effectsOutput && this.ctx)
      this.effectsOutput.gain.setTargetAtTime(
        this.effectVolume,
        this.ctx.currentTime,
        0.025,
      );
  }

  private players: RemotePlayer[] = [];
  private voices = new Map<string, RemoteVoice>();
  private revMatchSequences = new Map<string, number>();
  // Uma carga por arquivo de audio, mesmo que duas motos usem o mesmo WAV.
  private idleAudioRequests = new Map<IdleSoundName, Promise<void>>();

  setRemotePlayers(players: RemotePlayer[]) {
    this.players = players;
    const live = new Set(players.filter((p) => p.connected).map((p) => p.id));

    for (const [id, v] of this.voices)
      if (!live.has(id)) {
        v.stopHorn?.();
        for (const h of v.horns) h.stop();
        v.gain.disconnect();
        v.pan.disconnect();
        this.voices.delete(id);
      }

    for (const id of this.revMatchSequences.keys())
      if (!players.some((p) => p.id === id)) this.revMatchSequences.delete(id);

    for (const player of players) {
      if (player.connected && this.ready) {
        const v = this.voice(player.id);
        if (player.state.hornHeld && !v.stopHorn)
          v.stopHorn = this.startHorn(v.gain, 1);
        else if (!player.state.hornHeld && v.stopHorn) {
          v.stopHorn();
          v.stopHorn = undefined;
        }
      }

      const sequence = player.state.revMatchSequence ?? 0,
        previous = this.revMatchSequences.get(player.id);
      if (previous !== undefined && sequence > previous)
        this.remoteRevMatch(player.id);
      this.revMatchSequences.set(player.id, sequence);
    }
  }

  private voice(id: string) {
    let v = this.voices.get(id);
    if (v) return v;
    const c = this.ctx!,
      gain = c.createGain(),
      pan = c.createStereoPanner();
    gain.gain.value = 0;
    gain.connect(pan);
    pan.connect(this.effectsOutput!);
    v = { gain, pan, horns: new Set() };

    this.voices.set(id, v);
    return v;
  }

  updateRemotes(
    listener: Position,
    matrix: ArrayLike<number>,
    audible: boolean,
    peers: Map<string, { bike: { root: { position: Position } } }>,
  ) {
    if (!this.ready || !this.ctx) return;
    const t = this.ctx.currentTime;

    for (const p of this.players) {
      if (!p.connected) continue;
      const v = this.voice(p.id),
        s = p.state,
        pos = peers.get(p.id)?.bike.root.position || s,
        dx = pos.x - listener.x,
        dy = pos.y - listener.y,
        dz = pos.z - listener.z,
        d = Math.hypot(dx, dy, dz);

      const attenuation = d >= 90 ? 0 : Math.pow(1 - d / 90, 2) / (1 + d / 12);
      v.gain.gain.setTargetAtTime(audible ? attenuation : 0, t, 0.12);
      v.pan.pan.setTargetAtTime(
        Math.max(
          -1,
          Math.min(
            1,
            (dx * matrix[0] + dy * matrix[1] + dz * matrix[2]) / Math.max(d, 1),
          ),
        ),
        t,
        0.12,
      );
    }
  }

  remoteHorn(id: string) {
    if (!this.ready || !this.ctx || !this.hornBuffer) return;
    const v = this.voices.get(id);
    if (!v || v.horns.size >= 2) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.hornBuffer;
    source.connect(v.gain);
    v.horns.add(source);
    source.onended = () => {
      source.disconnect();
      v.horns.delete(source);
    };
    source.start();
  }

  private remoteRevMatch(id: string) {
    if (!this.ready || !this.ctx) return;

    const voice = this.voice(id),
      oscillator = this.ctx.createOscillator(),
      gain = this.ctx.createGain(),
      at = this.ctx.currentTime;

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(190, at);
    oscillator.frequency.exponentialRampToValueAtTime(620, at + 0.075);
    oscillator.frequency.exponentialRampToValueAtTime(260, at + 0.28);

    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(
      ENGINE_TUNING.revMatchVolume * 0.16,
      at + 0.018,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);

    oscillator.connect(gain);
    gain.connect(voice.gain);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(at);
    oscillator.stop(at + 0.31);
  }

  ctx?: AudioContext;
  volume = 0.5;
  ambience = 0.35;
  vehicle: VehicleId = "pop";
  layers: Layer[] = [];
  ready = false;
  private loading?: Promise<void>;
  private hornBuffer?: AudioBuffer;
  private hornHeld = false;
  private stopLocalHorn?: () => void;
  private queuedDiscoveries = 0;
  private discoveryQueueUntil = 0;
  private crashQueued = false;

  async start() {
    if (!this.ctx) this.ctx = new AudioContext();
    await this.ctx.resume();

    if (this.ready) return;

    if (!this.loading)
      this.loading = this.load().catch((error) => {
        this.loading = undefined;
        throw error;
      });

    await this.loading;
  }

  private async load() {
    const c = this.ctx!,
      names = [...AUDIO_ASSETS.map((a) => a.name), "horn"];

    const buffers = await Promise.all(
      names.map(async (name) => {
        const response = await fetch(
          `/audio/${name}.wav`,
          name.startsWith("sahara-") ? { cache: "reload" } : undefined,
        );
        if (!response.ok) throw new Error(`Não foi possível carregar ${name}`);
        return c.decodeAudioData(await response.arrayBuffer());
      }),
    );

    const limiter = c.createDynamicsCompressor();
    this.output = limiter;
    limiter.threshold.value = -10;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.008;
    limiter.release.value = 0.2;
    limiter.connect(c.destination);
    this.effectsOutput = c.createGain();
    this.effectsOutput.gain.value = this.effects;
    this.effectsOutput.connect(limiter);

    buffers.slice(0, AUDIO_ASSETS.length).forEach((buffer, i) => {
      const asset = AUDIO_ASSETS[i];
      const source = c.createBufferSource(),
        gain = c.createGain(),
        filter = c.createBiquadFilter();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      filter.type = "lowpass";
      filter.frequency.value =
        asset.bank === "wind"
          ? 700
          : asset.bank === "cg150"
            ? CG_AUDIO_TUNING.filter
            : asset.bank === "sahara"
              ? SAHARA_AUDIO_TUNING.filter
              : 1800;
      // Todos os arquivos da Sahara passam pelo mesmo filtro; ajuste se o seu projeto usa equalização própria.
      // Pop e Cub: áudio sem filtro passa-baixas
      if (asset.bank === "engine") {
        source.connect(gain);
      } else {
        source.connect(filter);
        filter.connect(gain);
      }

      gain.connect(limiter);
      source.start();
      this.layers.push({
        source,
        gain,
        filter,
        bank: asset.bank,
        load: asset.load,
        idle: false,
      });
    });

    this.hornBuffer = buffers[AUDIO_ASSETS.length];
    this.ready = true;
    this.setHorn(this.hornHeld);
    this.setRemotePlayers(this.players);

    while (this.queuedDiscoveries > 0) {
      this.queuedDiscoveries--;
      this.scheduleDiscovery();
    }

    if (this.crashQueued) {
      this.crashQueued = false;
      this.playCrash();
    }
  }

  // Carrega cada WAV de marcha lenta sob demanda, sem duplicar Pop/Cub.
  // Se o WAV ainda nao existe, mantem os loops originais sem impedir o inicio do jogo.
  private requestIdleAudio(soundName: IdleSoundName, bank: AudioBank) {
    if (this.idleAudioRequests.has(soundName) || !this.ctx || !this.output)
      return;
    const ctx = this.ctx,
      output = this.output;
    const url = `/audio/${soundName}.wav`;
    const request = (async () => {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404)
          console.info(
            `[Moto Trail] WAV opcional ainda ausente: public/audio/${soundName}.wav`,
          );
        else
          console.warn(
            `[Moto Trail] Falha no audio opcional ${url}: ${response.status}`,
          );
        return;
      }
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      const source = ctx.createBufferSource(),
        gain = ctx.createGain(),
        filter = ctx.createBiquadFilter();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      filter.type = "lowpass";
      filter.frequency.value =
        bank === "sahara"
          ? SAHARA_AUDIO_TUNING.filter
          : bank === "cg150"
            ? CG_AUDIO_TUNING.filter
            : 1800;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      source.start();
      this.layers.push({
        source,
        gain,
        filter,
        bank,
        load: false,
        idle: true,
        idleSound: soundName,
      });
    })().catch((error) => {
      console.warn(
        `[Moto Trail] Nao foi possivel carregar o audio opcional ${url}:`,
        error,
      );
    });
    this.idleAudioRequests.set(soundName, request);
  }

  playDiscovery() {
    if (this.effects <= 0) return;

    if (!this.ready || !this.ctx || !this.output) {
      this.queuedDiscoveries = Math.min(this.queuedDiscoveries + 1, 32);
      return;
    }

    this.scheduleDiscovery();
  }

  playCrash() {
    if (this.effects <= 0) return;

    if (!this.ready || !this.ctx || !this.output) {
      this.crashQueued = true;
      return;
    }

    const c = this.ctx,
      at = c.currentTime,
      osc = c.createOscillator(),
      tone = c.createGain(),
      noise = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      noiseGain = c.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(115, at);
    osc.frequency.exponentialRampToValueAtTime(38, at + 0.24);

    tone.gain.setValueAtTime(0.0001, at);
    tone.gain.exponentialRampToValueAtTime(0.42, at + 0.012);
    tone.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);

    const buffer = c.createBuffer(
        1,
        Math.ceil(c.sampleRate * 0.18),
        c.sampleRate,
      ),
      samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++)
      samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);

    noise.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = 750;
    noiseGain.gain.setValueAtTime(0.22, at);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);

    osc.connect(tone);
    tone.connect(this.effectsOutput!);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.effectsOutput!);

    osc.onended = () => {
      osc.disconnect();
      tone.disconnect();
    };
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      noiseGain.disconnect();
    };

    osc.start(at);
    osc.stop(at + 0.33);
    noise.start(at);
    noise.stop(at + 0.19);
  }

  private scheduleDiscovery() {
    if (this.effects <= 0) return;

    const c = this.ctx!,
      output = this.effectsOutput!,
      start = Math.max(c.currentTime, this.discoveryQueueUntil);

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];

    for (let i = 0; i < notes.length; i++) {
      const at = start + i * 0.55,
        duration = i === notes.length - 1 ? 0.8 : 0.58;

      const oscillator = c.createOscillator(),
        gain = c.createGain();

      oscillator.type = i === notes.length - 1 ? "sine" : "triangle";

      oscillator.frequency.setValueAtTime(notes[i], at);

      gain.gain.setValueAtTime(0.0001, at);

      gain.gain.exponentialRampToValueAtTime(0.11, at + 0.045);

      gain.gain.setValueAtTime(0.044, at + 0.28);

      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

      oscillator.connect(gain);
      gain.connect(output);

      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };

      oscillator.start(at);
      oscillator.stop(at + duration + 0.01);
    }

    this.discoveryQueueUntil = start + DISCOVERY_SOUND_DURATION;
  }

  update(
    speed: number,
    gear: number,
    throttle: number,
    paused: boolean,
    brake = 0,
    engine?: Partial<
      Pick<
        Powertrain,
        | "rpm"
        | "ratio"
        | "limiting"
        | "cutting"
        | "lugging"
        | "revMatchTime"
        | "revMatchPeak"
        | "revMatchEnvelope"
      >
    >,
  ) {
    if (!this.ready || !this.ctx) return;
    const c = this.ctx,
      t = c.currentTime,
      spec = getVehicle(this.vehicle),
      v = Math.max(0, speed),
      ratio = v / spec.maxSpeed;
    const rev =
      engine?.rpm !== undefined
        ? Math.max(
            0,
            Math.min(
              1,
              (engine.rpm - spec.idleRpm) / (spec.redlineRpm - spec.idleRpm),
            ),
          )
        : (engine?.ratio ??
          (spec.gears === 1
            ? ratio
            : Math.max(0, Math.min(1, (v - (gear - 1) * 5) / 7))));
    const revBlip =
      engine?.revMatchEnvelope ??
      (engine && engine.revMatchTime && engine.revMatchTime > 0
        ? Math.sin(
            Math.PI *
              (1 - engine.revMatchTime / ENGINE_TUNING.revMatchDuration),
          )
        : 0);

    // Pop/Cub usam a mesma gravacao. A marcha lenta e identificada pelo WAV compartilhado.
    const idleSound = idleSoundForVehicle(
      this.vehicle,
      spec.audio as AudioBank,
    );
    if (idleSound) this.requestIdleAudio(idleSound, spec.audio as AudioBank);
    const idleLayer = this.layers.find(
      (layer) => layer.idle && layer.idleSound === idleSound,
    );
    const tuning =
      spec.audio === "sahara"
        ? SAHARA_AUDIO_TUNING
        : spec.audio === "cg150"
          ? CG_AUDIO_TUNING
          : GENERIC_IDLE_AUDIO_TUNING;
    const gas =
      Math.max(0, Math.min(1, throttle)) *
      (1 - Math.max(0, Math.min(1, brake)));
    const fadeStart = tuning.idleFadeStart;
    const fadeEnd = Math.max(fadeStart + 0.001, tuning.idleFadeEnd);
    const u = Math.max(
      0,
      Math.min(1, (rev - fadeStart) / (fadeEnd - fadeStart)),
    );
    const smooth = u * u * (3 - 2 * u);
    // Sem WAV exclusivo, mantem o ronco antigo ao inves de criar silencio.
    const idleMix = idleLayer ? (1 - smooth) * (1 - Math.min(1, gas * 3)) : 0;
    const idleFactor = Math.sin((idleMix * Math.PI) / 2);
    const runningFactor = Math.cos((idleMix * Math.PI) / 2);

    for (const layer of this.layers) {
      let gain = 0,
        rate = 1;
      if (layer.bank === "wind") {
        gain = paused ? 0 : this.ambience * (0.06 + ratio * 0.16);
      } else if (layer.idle) {
        // O WAV compartilhado so toca quando a moto atual o utiliza.
        if (layer.idleSound === idleSound && !paused) {
          gain = this.volume * tuning.idleGain * idleFactor;
          rate = tuning.idlePlaybackRate;
          const cutoff =
            spec.audio === "sahara"
              ? SAHARA_AUDIO_TUNING.filter
              : spec.audio === "cg150"
                ? CG_AUDIO_TUNING.filter
                : spec.filter;
          layer.filter.frequency.setTargetAtTime(cutoff, t, 0.25);
        }
      } else if (
        (layer.bank === "cg150" || layer.bank === "sahara") &&
        layer.bank === spec.audio &&
        !paused
      ) {
        const vehicleTuning =
          layer.bank === "sahara" ? SAHARA_AUDIO_TUNING : CG_AUDIO_TUNING;
        const moving = Math.min(1, v / 5);
        gain =
          this.volume *
          (layer.load
            ? vehicleTuning.accelerationGain * Math.sqrt(gas)
            : (vehicleTuning.coastIdleGain +
                (vehicleTuning.coastGain - vehicleTuning.coastIdleGain) *
                  moving) *
              Math.sqrt(1 - gas)) *
          runningFactor;
        rate =
          vehicleTuning.minRate +
          (vehicleTuning.maxRate - vehicleTuning.minRate) *
            Math.max(rev, gas * 0.3);
        layer.filter.frequency.setTargetAtTime(vehicleTuning.filter, t, 0.25);
      } else if (layer.bank === spec.audio && !paused) {
        const load = Math.min(1, throttle * 0.8 + ratio * 0.2);
        gain =
          this.volume *
          (layer.load ? 0.55 * load : 0.42 * (1 - load * 0.7)) *
          runningFactor;
        rate =
          spec.pitch * (layer.load ? 0.95 + rev * 0.50 : 0.85 + rev * 0.25);
        layer.filter.frequency.setTargetAtTime(spec.filter, t, 0.25);
      }

      if (
        engine?.lugging &&
        !layer.idle &&
        layer.bank === spec.audio &&
        !paused
      ) {
        gain *= 1.08;
        rate *= 0.94;
      }
      if (revBlip > 0 && !layer.idle && layer.bank === spec.audio && !paused) {
        gain *= 1 + revBlip * ENGINE_TUNING.revMatchVolume;
        rate *= 1 + revBlip * 0.18;
      }
      const cutting =
        !!engine?.limiting &&
        !!engine.cutting &&
        !paused &&
        throttle > 0.25 &&
        brake < 0.05;
      if (layer.bank !== "wind" && !layer.idle && cutting)
        gain *= ENGINE_TUNING.cutGain;
      const response = layer.idle
        ? 0.16
        : layer.bank === "cg150"
          ? CG_AUDIO_TUNING.response
          : 0.16;
      layer.gain.gain.setTargetAtTime(
        gain,
        t,
        layer.bank !== "wind" && engine?.limiting && !layer.idle
          ? 0.008
          : response,
      );
      layer.source.playbackRate.setTargetAtTime(
        rate,
        t,
        layer.idle ? 0.12 : 0.2,
      );
    }
  }

  setHorn(held: boolean) {
    this.hornHeld = held;

    if (!held) {
      this.stopLocalHorn?.();
      this.stopLocalHorn = undefined;
    } else if (this.ready && !this.stopLocalHorn)
      this.stopLocalHorn = this.startHorn(this.effectsOutput!, 0.7);
  }

  private startHorn(output: AudioNode, volume: number) {
    const c = this.ctx!,
      source = c.createBufferSource(),
      gain = c.createGain();

    source.buffer = this.hornBuffer!;
    source.loop = true;

    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.006);

    source.connect(gain);
    gain.connect(output);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start();

    return () => {
      const now = c.currentTime;

      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.008);

      source.stop(now + 0.008);
    };
  }
}
