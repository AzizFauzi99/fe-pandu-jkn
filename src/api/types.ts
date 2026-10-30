export type Gender = "laki-laki" | "perempuan";

export interface Profile {
  email: string;
  nama_lengkap: string | null;
  nomor_hp: string | null;
  tanggal_lahir: string | null;
  jenis_kelamin: Gender | null;
  nik: string | null;
  tinggi_badan_cm: number | null;
  berat_badan_kg: number | null;
  alergi_makanan: string[];
  riwayat_penyakit: string[];
}

/** Body yang dikirim ke PUT /api/profile (email hanya-baca, tidak ikut). */
export interface ProfileBody {
  nama_lengkap: string | null;
  nomor_hp: string | null;
  tanggal_lahir: string | null;
  jenis_kelamin: Gender | null;
  nik: string | null;
  tinggi_badan_cm: number | null;
  berat_badan_kg: number | null;
  alergi_makanan: string[];
  riwayat_penyakit: string[];
}

export interface RegisterPayload {
  nama_lengkap: string;
  email: string;
  no_hp: string;
  nik: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterResponse {
  message: string;
  nik: string;
}

export interface Session {
  id: string;
  title: string;
  starred: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatImage {
  mime_type: string;
  data: string;
}

export interface ChatRequestBody {
  user_input: string;
  session_id: string | null;
  images: ChatImage[];
}

export interface DoctorSummary {
  keluhan_utama: string;
  onset: string;
  tingkat_keparahan: string;
  gejala_penyerta: string[];
  usia: number | null;
  jenis_kelamin: string | null;
  riwayat_penyakit: string[];
  alergi: string[];
  obat_saat_ini: string[];
  level_triase: string;
  saran_diberikan: string[];
  data_belum_lengkap: string[];
}

export type BpjsCategory =
  | "sudah_aktif"
  | "bisa_daftar"
  | "perlu_tindakan"
  | "tidak_bisa"
  | "perlu_verifikasi";

export interface BpjsStatus {
  userId: string;
  ditemukan: boolean;
  statusKode: number | null;
  status: string | null;
  segmen: string | null;
  kelasRawat: string | null;
  bisaIkut: boolean | null;
  kategori: BpjsCategory;
  alasan: string;
  tindakan: string;
}
