import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { initial } from "../lib/profile";
import { Icon, Logo } from "./Icons";

interface ShellProps {
  active: "chat" | "profile";
  title: string;
  column?: boolean;
  sidebarTop?: ReactNode;
  sidebarBody?: ReactNode;
  topActions?: ReactNode;
  children: ReactNode;
}

export function Shell({
  active,
  title,
  column = false,
  sidebarTop,
  sidebarBody,
  topActions,
  children,
}: ShellProps) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (menuWrap.current && !menuWrap.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={open ? "shell open" : "shell"}>
      <aside
        className="side"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("a, .conv, .newbtn")) setOpen(false);
        }}
      >
        <div className="brand">
          <Logo />
          Pandu JKN
        </div>

        {sidebarTop}

        <nav className={sidebarBody ? "nav tight" : "nav"}>
          <NavLink to="/chat" className={active === "chat" ? "on" : undefined}>
            <Icon name="chat" />
            Percakapan
          </NavLink>
          <NavLink to="/profile" className={active === "profile" ? "on" : undefined}>
            <Icon name="user" />
            Profil
          </NavLink>
        </nav>

        {sidebarBody}

        <div className="meWrap" ref={menuWrap}>
          {menuOpen && (
            <div className="meMenu" role="menu">
              <button className="menuItem" type="button" role="menuitem" onClick={handleLogout}>
                <Icon name="logout" />
                Keluar
              </button>
            </div>
          )}
          <button
            className="me meBtn"
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span className="avatar">{initial(profile?.nama_lengkap)}</span>
            <span>
              <b>{profile?.nama_lengkap || "Pengguna"}</b>
              <small>Peserta JKN</small>
            </span>
          </button>
        </div>
      </aside>

      <section className={column ? "main col" : "main"}>
        <header className="top">
          <button
            className="mbtn menuBtn"
            type="button"
            aria-label="Buka menu"
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name="menu" />
          </button>
          <span>{title}</span>
          <span className="grow" />
          {topActions}
        </header>
        {children}
      </section>
    </div>
  );
}
