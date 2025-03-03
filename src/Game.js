import React, { useState, useRef, useEffect } from 'react';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const CIRCLE_RADIUS = 30;
const MERGE_DURATION = 2000; // thời gian (ms) sau khi gộp

// Hàm khởi tạo các hình tròn với vị trí random
const initialCircles = () => {
  let circles = [];
  const n = 5, m = 5; // số lượng hình tròn A và C
  for (let i = 0; i < n; i++) {
    circles.push({
      id: 'A-' + i,
      type: 'A',
      // lưu tọa độ trung tâm theo hệ tọa độ của container
      x: Math.random() * (GAME_WIDTH - 2 * CIRCLE_RADIUS) + CIRCLE_RADIUS,
      y: Math.random() * (GAME_HEIGHT - 2 * CIRCLE_RADIUS) + CIRCLE_RADIUS,
      radius: CIRCLE_RADIUS,
      isMerging: false, // đánh dấu quá trình gộp
    });
  }
  for (let j = 0; j < m; j++) {
    circles.push({
      id: 'C-' + j,
      type: 'C',
      x: Math.random() * (GAME_WIDTH - 2 * CIRCLE_RADIUS) + CIRCLE_RADIUS,
      y: Math.random() * (GAME_HEIGHT - 2 * CIRCLE_RADIUS) + CIRCLE_RADIUS,
      radius: CIRCLE_RADIUS,
      isMerging: false,
    });
  }
  return circles;
};

function Game() {
  const [circles, setCircles] = useState(initialCircles());
  const [draggingId, setDraggingId] = useState(null);
  // Lưu offset giữa vị trí chuột (trong hệ container) và tâm hình tròn
  const dragOffset = useRef({ offsetX: 0, offsetY: 0 });
  const containerRef = useRef(null);

  // Khi bắt đầu kéo, tính toán offset dựa trên tọa độ của container
  const handleMouseDown = (e, id) => {
    const circle = circles.find(c => c.id === id);
    if (!circle || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    // chuyển đổi tọa độ chuột sang hệ container
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    dragOffset.current = { 
      offsetX: mouseX - circle.x, 
      offsetY: mouseY - circle.y 
    };
    setDraggingId(id);
  };

  // Khi di chuyển chuột, cập nhật vị trí hình tròn theo tọa độ của container
  const handleMouseMove = (e) => {
    if (draggingId && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      setCircles(prev =>
        prev.map(c => {
          if (c.id === draggingId) {
            let newX = mouseX - dragOffset.current.offsetX;
            let newY = mouseY - dragOffset.current.offsetY;
            // Giới hạn trong khu vực game
            newX = Math.max(c.radius, Math.min(GAME_WIDTH - c.radius, newX));
            newY = Math.max(c.radius, Math.min(GAME_HEIGHT - c.radius, newY));
            return { ...c, x: newX, y: newY };
          }
          return c;
        })
      );
    }
  };

  // Kết thúc kéo thả
  const handleMouseUp = () => {
    setDraggingId(null);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId]);

  // Vòng lặp cập nhật va chạm và hiệu ứng đẩy
  useEffect(() => {
    let animationFrameId;
    const update = () => {
      setCircles(prevCircles => {
        let newCircles = [...prevCircles];

        // 1. Kiểm tra va chạm gộp: chỉ khi có hình đang kéo
        if (draggingId) {
          const dragged = newCircles.find(c => c.id === draggingId);
          if (dragged && !dragged.isMerging) {
            newCircles.forEach(other => {
              if (
                other.id !== dragged.id &&
                !other.isMerging &&
                dragged.type !== other.type
              ) {
                const dx = dragged.x - other.x;
                const dy = dragged.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < dragged.radius + other.radius) {
                  // Đánh dấu merging
                  dragged.isMerging = true;
                  other.isMerging = true;
                  // Xoá sau MERGE_DURATION
                  setTimeout(() => {
                    setCircles(current =>
                      current.filter(c => c.id !== dragged.id && c.id !== other.id)
                    );
                  }, MERGE_DURATION);
                }
              }
            });
          }
        }

        // 2. Hiệu ứng đẩy nếu 2 hình cùng loại chạm nhau
        for (let i = 0; i < newCircles.length; i++) {
          for (let j = i + 1; j < newCircles.length; j++) {
            const c1 = newCircles[i];
            const c2 = newCircles[j];
            if (c1.type === c2.type && !c1.isMerging && !c2.isMerging) {
              const dx = c2.x - c1.x;
              const dy = c2.y - c1.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = c1.radius + c2.radius;
              if (dist < minDist && dist > 0) {
                const overlap = (minDist - dist) / 2;
                const offsetX = (dx / dist) * overlap;
                const offsetY = (dy / dist) * overlap;
                if (c1.id !== draggingId) {
                  c1.x -= offsetX;
                  c1.y -= offsetY;
                }
                if (c2.id !== draggingId) {
                  c2.x += offsetX;
                  c2.y += offsetY;
                }
                c1.x = Math.max(c1.radius, Math.min(GAME_WIDTH - c1.radius, c1.x));
                c1.y = Math.max(c1.radius, Math.min(GAME_HEIGHT - c1.radius, c1.y));
                c2.x = Math.max(c2.radius, Math.min(GAME_WIDTH - c2.radius, c2.x));
                c2.y = Math.max(c2.radius, Math.min(GAME_HEIGHT - c2.radius, c2.y));
              }
            }
          }
        }
        return newCircles;
      });
      animationFrameId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animationFrameId);
  }, [draggingId]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        border: '1px solid black',
        margin: '0 auto'
      }}
    >
      {circles.map(circle => (
        <div
          key={circle.id}
          onMouseDown={e => handleMouseDown(e, circle.id)}
          style={{
            position: 'absolute',
            left: circle.x - circle.radius,
            top: circle.y - circle.radius,
            width: circle.radius * 2,
            height: circle.radius * 2,
            borderRadius: '50%',
            backgroundColor: circle.type === 'A' ? 'blue' : 'red',
            opacity: circle.isMerging ? 0.5 : 1,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        />
      ))}
    </div>
  );
}

export default Game;
