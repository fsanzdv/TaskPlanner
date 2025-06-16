import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-content">
          <p className="copyright">
            &copy; {currentYear} TaskPlanner - Todos los derechos reservados
          </p>
          
          <div className="footer-links">
            <a href="/privacy" className="footer-link">Política de Privacidad</a>
            <a href="/terms" className="footer-link">Términos de Uso</a>
            <a href="/contact" className="footer-link">Contacto</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;