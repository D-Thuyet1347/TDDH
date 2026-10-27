import React from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";

const Home = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <main>
        {/* HERO */}
        <Hero />

        {/* INTRO */}
        <section className="relative py-24 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-950/30 to-slate-950" />

          <div className="relative max-w-7xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm text-purple-300 backdrop-blur">
              ✨ Image Love
            </span>

            <h2 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
              Lưu giữ những
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
                {" "}khoảnh khắc yêu thương
              </span>
            </h2>

            <p className="max-w-2xl mx-auto mt-6 text-gray-400 text-lg leading-relaxed">
              Image Love là không gian giúp bạn lưu trữ,
              quản lý và chia sẻ những hình ảnh đáng nhớ
              một cách đơn giản và đẹp mắt.
            </p>
          </div>
        </section>

        {/* FEATURES */}
        <section className="px-6 pb-24">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* CARD 1 */}
            <div className="group p-8 rounded-3xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-pink-500/40 transition duration-500">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                🖼️
              </div>

              <h3 className="mt-6 text-xl font-bold">
                Lưu trữ hình ảnh
              </h3>

              <p className="mt-3 text-gray-400 leading-relaxed">
                Lưu giữ những hình ảnh quan trọng
                của bạn trong một không gian riêng
                và dễ quản lý.
              </p>
            </div>

            {/* CARD 2 */}
            <div className="group p-8 rounded-3xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-purple-500/40 transition duration-500">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                ❤️
              </div>

              <h3 className="mt-6 text-xl font-bold">
                Chia sẻ khoảnh khắc
              </h3>

              <p className="mt-3 text-gray-400 leading-relaxed">
                Tạo nên bộ sưu tập hình ảnh và chia sẻ
                những khoảnh khắc đặc biệt với người
                bạn yêu thương.
              </p>
            </div>

            {/* CARD 3 */}
            <div className="group p-8 rounded-3xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-blue-500/40 transition duration-500">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                🔒
              </div>

              <h3 className="mt-6 text-xl font-bold">
                Riêng tư & an toàn
              </h3>

              <p className="mt-3 text-gray-400 leading-relaxed">
                Hình ảnh của bạn được quản lý trong
                tài khoản riêng, giúp bạn dễ dàng
                kiểm soát dữ liệu.
              </p>
            </div>

          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto relative overflow-hidden rounded-[32px] bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 p-10 md:p-16 text-center">

            <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full" />
            <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-white/10 rounded-full" />

            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold">
                Bắt đầu lưu giữ kỷ niệm
              </h2>

              <p className="max-w-xl mx-auto mt-5 text-white/80">
                Tạo không gian hình ảnh của riêng bạn
                và lưu giữ những khoảnh khắc không thể
                thay thế.
              </p>

              <button
                onClick={() => {
                  window.location.href = "/image";
                }}
                className="mt-8 px-8 py-3 rounded-full bg-white text-purple-600 font-bold hover:scale-105 hover:shadow-2xl transition"
              >
                Khám phá hình ảnh →
              </button>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;