/**
 * Dashboard 应用入口文件
 * @module main
 */
import { Dashboard } from "./app/Dashboard.js";

// 初始化应用
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new Dashboard();
  });
} else {
  new Dashboard();
}

