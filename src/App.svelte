<script>
  import { onMount } from "svelte";
  let videoElement;
  // 播放进度（0~1）
  let progress = 0;
  // 鼠标悬停位置（0~1），null 表示不显示
  let hover = null;
  let currentTimeText = "00:00";
  let durationText = "00:00";

  // 打开文件
  function openFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";

    input.onchange = () => {
      const file = input.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        videoElement.src = url;
        videoElement.play();

        videoElement.onloadedmetadata = () => {
          setupVideoEvents();
          durationText = formatTime(videoElement.duration);
        };
      }
    };

    input.click();
  }

  function play() {
    videoElement?.play();
  }

  function pause() {
    videoElement?.pause();
  }

  // 监听播放进度
  function setupVideoEvents() {
    if (!videoElement) return;

    videoElement.addEventListener("timeupdate", () => {
      if (videoElement.duration) {
        progress = videoElement.currentTime / videoElement.duration;
        currentTimeText = formatTime(videoElement.currentTime);//更新时间文本
      }
    });
  }

  // 点击跳转
  function seek(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / rect.width;

    if (videoElement && videoElement.duration) {
      videoElement.currentTime = ratio * videoElement.duration;
      currentTimeText = formatTime(videoElement.currentTime);//点击后立即刷新时间显示
    }
  }

  // 鼠标悬停显示光标
  function updateHover(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    hover = Math.min(Math.max(x / rect.width, 0), 1);
  }

  onMount(() => {
    window.addEventListener("keydown", handleKey);
  });

  function handleKey(e) {
    if (!videoElement || !videoElement.duration) return;

    if (e.key === "ArrowLeft") {
      videoElement.currentTime = Math.max(0, videoElement.currentTime - 5);
    }

    if (e.key === "ArrowRight") {
      videoElement.currentTime = Math.min(
        videoElement.duration,
        videoElement.currentTime + 5
      );
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

  <!-- 顶部栏 -->
  <header class="top-bar">
    <span class="title">My Player</span>
  </header>

  <!-- 视频显示区域 -->
  <main class="video-area">
    <video
      bind:this={videoElement}
      style="max-width: 100%; max-height: 100%; background: black;"
    ></video>
  </main>

  <!-- 自定义进度条 -->
  <div 
    class="progress-container"
    on:click={seek}
    on:mousemove={updateHover}
    on:mouseleave={() => hover = null}
  >
    <div class="time-display">
      {currentTimeText} / {durationText}
    </div>

    <div class="progress-bg"></div>
    <div 
      class="progress-fill" 
      style="width: {progress * 100}%"
    ></div>

    {#if hover !== null}
      <div 
        class="progress-hover" 
        style="left: {hover * 100}%"
      ></div>
    {/if}
  </div>

  <!-- 控制按键 -->
  <footer class="control-bar">
    <button on:click={openFile}>📂 打开文件</button>
    <button on:click={play}>▶ 播放</button>
    <button on:click={pause}>⏸ 暂停</button>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #111;
    color: white;
    font-family: sans-serif;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .top-bar {
    height: 40px;
    background: #1a1a1a;
    display: flex;
    align-items: center;
    padding: 0 12px;
    border-bottom: 1px solid #333;
  }

  .title {
    font-size: 16px;
    opacity: 0.8;
  }

  .video-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #222;
  }

  /* 自定义进度条样式 */
  .progress-container {
    position: relative;
    height: 8px;
    cursor: pointer;
    background: transparent;
    margin: 0 12px;
  }

  .progress-bg {
    position: absolute;
    height: 4px;
    background: #444;
    width: 100%;
    top: 2px;
    border-radius: 4px;
  }

  .progress-fill {
    position: absolute;
    height: 4px;
    background: #fff;
    top: 2px;
    border-radius: 4px;
  }

  .progress-hover {
    position: absolute;
    width: 2px;
    height: 8px;
    background: #aaa;
    top: 0;
    transform: translateX(-1px);
  }

  .control-bar {
    height: 60px;
    background: #1a1a1a;
    border-top: 1px solid #333;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
  }

  .time-display {
    color: #ddd;
    font-size: 14px;
    padding: 4px 16px;
    user-select: none;
    font-family: monospace;
  }


  button {
    background: #333;
    border: none;
    color: white;
    padding: 8px 14px;
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover {
    background: #444;
  }
</style>
