<script>
  import { onDestroy, onMount } from "svelte";

  const speedOptions = [2, 1.5, 1.25, 1, 0.75, 0.5];

  let videoElement;
  let progress = 0;
  let hover = null;
  let currentTimeText = "00:00";
  let durationText = "00:00";
  let volume = 0.7;
  let playbackRate = 1;
  let isFullscreen = false;
  let showSpeedMenu = false;
  let isDragging = false;
  let activePointerId = null;
  let showFastHint = false;
  let rightHoldTimeout = null;
  let isRightHolding = false;

  let playlist = [];
  let currentIndex = -1;
  let progressBarEl;
  let isDraggingOver = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function addLocalFiles() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.multiple = true;

    input.onchange = () => {
      if (!input.files?.length) return;
      enqueueFiles(input.files);
    };

    input.click();
  }

  function enqueueFiles(fileList) {
    const getFileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;
    const existingKeys = new Set(playlist.map((p) => p.key ?? p.name));
    const newItems = Array.from(fileList)
      .filter((file) => !existingKeys.has(getFileKey(file)))
      .map((file) => ({
        id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        url: URL.createObjectURL(file),
        key: getFileKey(file)
      }));

    if (!newItems.length) return;
    playlist = [...playlist, ...newItems];
    const firstNewIndex = playlist.length - newItems.length;
    playTrack(firstNewIndex);
  }

  function playTrack(index) {
    if (!videoElement || !playlist[index]) return;
    currentIndex = index;
    const track = playlist[index];
    videoElement.src = track.url;
    videoElement.playbackRate = playbackRate;
    videoElement.volume = volume;
    videoElement.currentTime = 0;
    videoElement.play().catch(() => {});
  }

  function setPlaybackRate(rate) {
    playbackRate = rate;
    if (videoElement) {
      videoElement.playbackRate = rate;
    }
  }

  function setVolume(val) {
    volume = clamp(val, 0, 1);
    if (videoElement) {
      videoElement.volume = volume;
    }
  }

  function changeVolume(delta) {
    setVolume(volume + delta);
  }

  function seekDelta(seconds) {
    if (!videoElement || !videoElement.duration) return;
    const next = clamp(videoElement.currentTime + seconds, 0, videoElement.duration);
    videoElement.currentTime = next;
    currentTimeText = formatTime(videoElement.currentTime);
  }

  function handleTimeUpdate() {
    if (!videoElement?.duration) return;
    progress = videoElement.currentTime / videoElement.duration;
    currentTimeText = formatTime(videoElement.currentTime);
  }

  function handleLoadedMetadata() {
    if (!videoElement?.duration) return;
    durationText = formatTime(videoElement.duration);
  }

  function seek(event) {
    const ratio = getSeekRatio(event);
    updateCurrentTimeByRatio(ratio);
  }

  function seekByKey(event) {
    if (!videoElement || !videoElement.duration) return;
    const delta = videoElement.duration * 0.02;
    if (event.key === "ArrowLeft") {
      videoElement.currentTime = Math.max(0, videoElement.currentTime - delta);
    }
    if (event.key === "ArrowRight") {
      videoElement.currentTime = Math.min(
        videoElement.duration,
        videoElement.currentTime + delta
      );
    }
    if (event.key === "Home") {
      videoElement.currentTime = 0;
    }
    if (event.key === "End") {
      videoElement.currentTime = videoElement.duration;
    }
  }

  function updateHover(event) {
    const ratio = getSeekRatio(event);
    hover = clamp(ratio, 0, 1);
  }

  function handlePlaylistDragOver(e) {
    if (e.dataTransfer?.types.includes("Files")) {
      e.preventDefault();
      isDraggingOver = true;
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function handlePlaylistDragLeave(e) {
    const next = e.relatedTarget;
    if (!next || !e.currentTarget.contains(next)) {
      isDraggingOver = false;
    }
  }

  function handlePlaylistDrop(e) {
    if (!e.dataTransfer?.files?.length) {
      isDraggingOver = false;
      return;
    }
    e.preventDefault();
    isDraggingOver = false;
    enqueueFiles(e.dataTransfer.files);
  }

  function getSeekRatio(event) {
    const target = progressBarEl || event.currentTarget;
    if (!target) return 0;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    return clamp(x / rect.width, 0, 1);
  }

  function updateCurrentTimeByRatio(ratio) {
    if (videoElement && videoElement.duration) {
      videoElement.currentTime = ratio * videoElement.duration;
      currentTimeText = formatTime(videoElement.currentTime);
      progress = ratio;
    }
  }

  function startSeekDrag(event) {
    isDragging = true;
    activePointerId = event.pointerId;
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    const ratio = getSeekRatio(event);
    updateCurrentTimeByRatio(ratio);
    event.preventDefault();
  }

  function handleDragMove(event) {
    if (!isDragging) return;
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    const ratio = getSeekRatio(event);
    updateCurrentTimeByRatio(ratio);
  }

  function stopSeekDrag(event) {
    if (!isDragging) return;
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
  }

  function closeSpeedMenu() {
    if (!showSpeedMenu) return;
    showSpeedMenu = false;
  }

  onMount(() => {
    if (videoElement) {
      videoElement.addEventListener("timeupdate", handleTimeUpdate);
      videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.volume = volume;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("click", closeSpeedMenu);
    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", stopSeekDrag);
  });

  onDestroy(() => {
    if (videoElement) {
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    document.removeEventListener("click", closeSpeedMenu);
    window.removeEventListener("pointermove", handleDragMove);
    window.removeEventListener("pointerup", stopSeekDrag);
    if (rightHoldTimeout) clearTimeout(rightHoldTimeout);
  });

  function onFullscreenChange() {
    isFullscreen = Boolean(document.fullscreenElement);
  }

  function handleKeyDown(e) {
    if (!videoElement) return;

    if (e.key === "ArrowLeft" && videoElement.duration) {
      videoElement.currentTime = Math.max(0, videoElement.currentTime - 5);
    }

    if (e.key === "ArrowRight" && videoElement.duration) {
      if (rightHoldTimeout) clearTimeout(rightHoldTimeout);
      // start hold detection
      rightHoldTimeout = setTimeout(() => {
        isRightHolding = true;
        videoElement.playbackRate = 2;
        videoElement.play().catch(() => {});
        showFastHint = true;
      }, 250);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      changeVolume(0.1);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      changeVolume(-0.1);
    }

    if (e.code === "Space") {
      e.preventDefault();
      togglePlayPause();
    }

    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      toggleFullscreen();
    }
  }

  function handleKeyUp(e) {
    if (!videoElement) return;
    if (e.key === "ArrowRight") {
      if (rightHoldTimeout) {
        clearTimeout(rightHoldTimeout);
        rightHoldTimeout = null;
      }
      if (isRightHolding) {
        videoElement.playbackRate = playbackRate;
        showFastHint = false;
        isRightHolding = false;
      } else {
        // tap: seek forward 5s
        seekDelta(5);
      }
    }
  }

  function togglePlayPause() {
    if (!videoElement) return;
    if (videoElement.paused) {
      videoElement.playbackRate = playbackRate;
      videoElement.play().catch(() => {});
    } else {
      videoElement.pause();
    }
  }

  function toggleFullscreen() {
    if (!videoElement) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoElement.requestFullscreen().catch(() => {});
    }
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
</script>

<div class="app">
  <header class="top-bar">
    <span class="title">Deoplayer</span>
    <div class="top-actions">
      <button class="ghost" on:click|stopPropagation={addLocalFiles}>＋ 添加本地视频</button>
    </div>
  </header>

  <div class="content">
    <aside class="playlist"
      on:dragover|preventDefault={handlePlaylistDragOver}
      on:dragleave={handlePlaylistDragLeave}
      on:drop|preventDefault={handlePlaylistDrop}
    >
      <div class="playlist-header">
        <div class="playlist-title">播放列表</div>
        <div class="subtitle">本地文件</div>
      </div>
      {#if isDraggingOver}
        <div class="drop-overlay playlist-drop">
          <div class="drop-box">
            <div class="drop-icon">⤓</div>
            <div class="drop-text">拖拽视频到这里添加</div>
          </div>
        </div>
      {/if}
      {#if playlist.length === 0}
        <div class="empty">暂无视频</div>
      {:else}
        <div class="playlist-items">
          {#each playlist as item, index}
            <div
              class={`playlist-item ${index === currentIndex ? "active" : ""}`}
              on:click={() => playTrack(index)}
            >
              <div class="thumb">{index + 1}</div>
              <div class="meta">
                <div class="name">{item.name}</div>
                {#if index === currentIndex}
                  <div class="tag">正在播放</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </aside>

    <main class="video-area">
      <div class="video-shell">
        <video
          bind:this={videoElement}
          class="player"
          on:click={togglePlayPause}
        ></video>

        {#if showFastHint}
          <div class="hint fast-hint">
            <span class="chevron chevron-1">›</span>
            <span class="chevron chevron-2">›</span>
            <span class="chevron chevron-3">›</span>
            <span class="hint-text">二倍速播放中</span>
          </div>
        {/if}

        <div class="progress-container">
          <div class="progress-rail"
            bind:this={progressBarEl}
            role="slider"
            tabindex="0"
            aria-label="进度条"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={(progress * 100).toFixed(0)}
            on:click={seek}
            on:pointerdown|preventDefault={startSeekDrag}
            on:pointermove={updateHover}
            on:pointerleave={() => hover = null}
            on:keydown={seekByKey}
          >
            <div class="progress-bg"></div>
            <div
              class="progress-fill"
              style={`width: ${progress * 100}%;`}
            ></div>

            {#if hover !== null}
              <div
                class="progress-hover"
                style={`left: ${hover * 100}%;`}
              ></div>
            {/if}
          </div>

          <div class="time-display">
            <span class="pill">{currentTimeText}</span>
            <span class="divider">/</span>
            <span class="pill muted">{durationText}</span>
          </div>
        </div>

        <footer class="control-bar">
          <div class="left-controls">
            <button class="primary" on:click={togglePlayPause}>
              {videoElement && !videoElement.paused ? "⏸" : "⏵"}
            </button>
          </div>

          <div class="right-controls">
            <div class="volume pill-block">
              <span class="label">音量</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume * 100}
                on:input={(e) => setVolume(e.target.value / 100)}
              />
              <span class="value">{Math.round(volume * 100)}%</span>
            </div>

            <div class="speed pill-block" on:click|stopPropagation>
              <span class="label">倍速</span>
              <div class="speed-menu">
                <button class="ghost speed-trigger" on:click|stopPropagation={() => (showSpeedMenu = !showSpeedMenu)}>
                  {playbackRate}x
                </button>
                {#if showSpeedMenu}
                  <div class="menu" on:click|stopPropagation>
                    {#each speedOptions as speed}
                      <button
                        class={`menu-item ${playbackRate === speed ? "active" : ""}`}
                        on:click={() => { setPlaybackRate(speed); showSpeedMenu = false; }}
                      >
                        {speed}x
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <button class="ghost pill-btn" on:click={toggleFullscreen}>{isFullscreen ? "🡼" : "⛶"}</button>
          </div>
        </footer>
      </div>
    </main>
  </div>
</div>

<style>
  :global(html, body, #app) {
    height: 100%;
    width: 100%;
    margin: 0;
    overflow: hidden;
    background: #0c0f14;
    color: #dfe7ef;
    font-family: "HarmonyOS Sans", "Segoe UI", "PingFang SC", sans-serif;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: radial-gradient(circle at 20% 20%, rgba(0, 162, 216, 0.2), transparent 25%),
                radial-gradient(circle at 80% 10%, rgba(220, 56, 129, 0.15), transparent 20%),
                #0c0f14;
  }

  .top-bar {
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(6px);
  }

  .title {
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.5px;
  }

  .top-actions {
    display: flex;
    gap: 8px;
  }

  .content {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    grid-template-rows: 1fr;
    height: calc(100vh - 54px);
    min-height: 0;
    width: 100%;
    overflow: hidden;
    align-items: stretch;
  }

  .playlist {
    position: relative;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    padding: 16px;
    background: linear-gradient(180deg, rgba(13, 18, 25, 0.95), rgba(12, 14, 20, 0.9));
    overflow: auto;
  }

  .playlist-header {
    margin-bottom: 12px;
  }

  .playlist-title {
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 4px;
  }

  .subtitle {
    color: #9fb3c8;
    font-size: 12px;
  }

  .playlist-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .playlist-item {
    display: flex;
    gap: 10px;
    padding: 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .playlist-item:hover {
    border-color: rgba(0, 162, 216, 0.4);
    background: rgba(0, 162, 216, 0.08);
  }

  .playlist-item.active {
    border-color: #00a2d8;
    background: rgba(0, 162, 216, 0.16);
  }

  .thumb {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #00a2d8, #dc3881);
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 700;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .name {
    color: #e9f1fb;
    font-size: 14px;
    line-height: 1.3;
    word-break: break-all;
  }

  .tag {
    display: inline-flex;
    padding: 2px 6px;
    border-radius: 8px;
    background: rgba(0, 162, 216, 0.2);
    color: #7cd7ff;
    font-size: 11px;
  }

  .empty {
    margin-top: 16px;
    color: #95a7b8;
    font-size: 13px;
  }

  .video-area {
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    padding: 8px 12px 12px;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.015);
    min-height: 0;
    height: 100%;
    flex: 1 1 auto;
    width: 100%;
    overflow: hidden;
    min-width: 0;
  }

  .video-shell {
    width: 100%;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    min-width: 0;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(0, 162, 216, 0.14), rgba(11, 17, 26, 0.8));
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    overflow: visible;
    position: relative;
  }

  .player {
    flex: 1;
    width: 100%;
    height: 100%;
    min-height: 0;
    min-width: 0;
    background: #000;
    object-fit: contain;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .progress-container {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    height: 52px;
    padding: 10px 14px;
    background: rgba(12, 14, 20, 0.45);
  }

  .progress-rail {
    position: relative;
    flex: 1;
    height: 12px;
    cursor: pointer;
    margin-right: 12px;
  }

  .time-display {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    user-select: none;
    font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 12px;
    color: #e8f0ff;
    padding: 0;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.0);
  }

  .pill {
    padding: 8px 12px;
    border-radius: 10px;
    background: rgba(15, 17, 22, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #f4f7ff;
    min-width: 64px;
    text-align: center;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
  }

  .pill.muted {
    background: rgba(255, 255, 255, 0.05);
    color: #cdd9ee;
  }

  .divider {
    opacity: 0.6;
    color: #cfd9e5;
  }

  .progress-bg {
    position: absolute;
    height: 6px;
    background: rgba(255, 255, 255, 0.14);
    width: 100%;
    left: 0;
    top: 2px;
    border-radius: 999px;
  }

  .progress-fill {
    position: absolute;
    height: 6px;
    background: linear-gradient(90deg, #00a2d8, #dc3881);
    left: 0;
    top: 2px;
    border-radius: 999px;
    transition: width 0.08s linear;
  }

  .progress-hover {
    position: absolute;
    width: 3px;
    height: 14px;
    background: #fff;
    top: -1px;
    transform: translateX(-1px);
    border-radius: 2px;
  }

  .control-bar {
    height: 78px;
    background: rgba(12, 14, 20, 0.85);
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 18px;
  }

  .left-controls,
  .right-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pill-block {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.05);
    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .label {
    color: #a9bed2;
    font-size: 13px;
  }

  input[type="range"] {
    appearance: none;
    width: 140px;
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(90deg, #00a2d8, #dc3881);
    outline: none;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #00a2d8;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  }

  .value {
    min-width: 36px;
    color: #e7f1ff;
    font-size: 13px;
    text-align: right;
  }

  button {
    background: linear-gradient(135deg, #00a2d8, #4f9dfc);
    border: none;
    color: white;
    padding: 10px 14px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    transition: transform 0.1s ease, box-shadow 0.15s ease, opacity 0.15s;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 20px rgba(0, 162, 216, 0.25);
  }

  button:active {
    opacity: 0.85;
    transform: translateY(0);
  }

  .ghost {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cfe6fb;
    box-shadow: none;
  }

  .primary {
    min-width: 60px;
    font-weight: 700;
    padding: 8px 12px;
    font-size: 18px;
    line-height: 1;
  }

  .pill-btn {
    padding: 10px 14px;
    border-radius: 12px;
  }

  .ghost:hover {
    border-color: rgba(0, 162, 216, 0.5);
    box-shadow: none;
  }

  .speed-menu {
    position: relative;
  }

  .speed-trigger {
    min-width: 70px;
  }

  .menu {
    position: absolute;
    bottom: calc(100% - 2px);
    left: 0;
    min-width: 120px;
    background: rgba(12, 14, 20, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
    padding: 6px;
    display: grid;
    gap: 6px;
    z-index: 5;
  }

  .menu-item {
    width: 100%;
    text-align: left;
    background: rgba(255, 255, 255, 0.04);
    color: #dfe7ef;
    border: 1px solid transparent;
  }

  .menu-item.active {
    background: linear-gradient(135deg, #00a2d8, #dc3881);
    color: #fff;
  }

  .hint {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(15, 17, 22, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
    color: #f4f7ff;
    font-weight: 700;
    letter-spacing: 0.5px;
    pointer-events: none;
    z-index: 6;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .hint .chevron {
    font-size: 16px;
    opacity: 0.3;
    animation: chevronPulse 1s infinite;
  }

  .chevron-2 {
    animation-delay: 0.15s;
  }

  .chevron-3 {
    animation-delay: 0.3s;
  }

  .hint-text {
    font-size: 13px;
  }

  @keyframes chevronPulse {
    0% { opacity: 0.25; }
    40% { opacity: 1; }
    100% { opacity: 0.25; }
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 7;
  }

  .playlist-drop {
    background: rgba(0, 0, 0, 0.15);
  }

  .drop-box {
    padding: 16px 22px;
    border-radius: 14px;
    background: rgba(16, 20, 28, 0.85);
    border: 1px dashed rgba(255, 255, 255, 0.2);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
    display: grid;
    gap: 8px;
    place-items: center;
    color: #eaf3ff;
    min-width: 260px;
  }

  .drop-icon {
    font-size: 24px;
  }

  .drop-text {
    font-size: 13px;
    opacity: 0.85;
  }
</style>
