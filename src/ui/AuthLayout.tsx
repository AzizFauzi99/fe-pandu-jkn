import type { ReactNode } from "react";
import { Brand, Icon } from "./Icons";

export function AuthLayout({ mode, children }: { mode: "login" | "register"; children: ReactNode }) {
  const isLogin = mode === "login";

  return (
    <main className="auth">
      <div className="pitch">
        <Brand />
        <h2>
          {isLogin
            ? "Urus BPJS Kesehatan dan keluhan kesehatan Anda lewat satu percakapan."
            : "Buat akun agar agen bisa menjawab sesuai kondisi Anda."}
        </h2>
        <ul className="feat">
          {isLogin ? (
            <>
              <li>
                <Icon name="check" />
                <div>
                  <b>Cek kepesertaan</b>
                  <span>Tahu apakah Anda berhak, apa yang menghalangi, dan cara mendaftar.</span>
                </div>
              </li>
              <li>
                <Icon name="heart" />
                <div>
                  <b>Konsultasi keluhan</b>
                  <span>Saran pertolongan pertama dan rujukan ke faskes atau dokter.</span>
                </div>
              </li>
              <li>
                <Icon name="clock" />
                <div>
                  <b>Status BPJS</b>
                  <span>Lihat status aktif atau nonaktif beserta penyebabnya.</span>
                </div>
              </li>
            </>
          ) : (
            <>
              <li>
                <Icon name="user" />
                <div>
                  <b>Data diri</b>
                  <span>Dipakai untuk mengecek kepesertaan dan menyiapkan ringkasan untuk dokter.</span>
                </div>
              </li>
              <li>
                <Icon name="lock" />
                <div>
                  <b>Data Anda terlindungi</b>
                  <span>Anda bisa mengubah atau menghapus data kapan saja dari halaman profil.</span>
                </div>
              </li>
            </>
          )}
        </ul>
        <footer>Jawaban agen bersifat informasi umum dan bukan pengganti dokter.</footer>
      </div>
      <div className="formside">
        <div className="card">
          <div className="mobbrand">
            <Brand />
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
