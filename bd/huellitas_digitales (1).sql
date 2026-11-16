-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 13, 2026 at 04:30 PM
-- Server version: 8.4.3
-- PHP Version: 8.3.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `huellitas_digitales`
--

-- --------------------------------------------------------

--
-- Table structure for table `cuidados`
--

CREATE TABLE `cuidados` (
  `id_cuidado` int NOT NULL,
  `id_mascota` int NOT NULL,
  `tipo_cuidado` enum('Vacuna','Baño') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` date NOT NULL,
  `detalle` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proxima_fecha` date DEFAULT NULL,
  `responsable` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ;

--
-- Dumping data for table `cuidados`
--

INSERT INTO `cuidados` (`id_cuidado`, `id_mascota`, `tipo_cuidado`, `fecha`, `detalle`, `proxima_fecha`, `responsable`, `observaciones`) VALUES
(1, 10, 'Vacuna', '2026-11-11', 'Refuerzo anual de rabia y desparasitación', '2027-11-11', 'Dra. Gómez', 'Sin reacciones adversas'),
(2, 1, 'Vacuna', '2025-10-02', 'Parvovirus', '2026-12-02', 'Dra. Rojas', NULL),
(3, 1, 'Baño', '2026-10-20', 'Normal', '2026-11-20', 'Casa', NULL),
(4, 1, 'Baño', '2026-11-03', 'Antipulgas', '2026-12-03', 'Peluquería canina', 'Le cortaron las uñas'),
(5, 2, 'Vacuna', '2025-08-20', 'Triple felina', '2026-08-20', 'Dr. Méndez', NULL),
(6, 2, 'Baño', '2026-09-28', 'Seco', NULL, 'Casa', 'No le gusta el agua'),
(7, 3, 'Vacuna', '2026-01-10', 'Rabia', '2027-01-10', 'Dr. Méndez', 'Le dio sueño ese día'),
(8, 3, 'Baño', '2026-10-30', 'Medicado', '2026-11-30', 'Veterinaria', 'Champú para piel sensible'),
(9, 6, 'Vacuna', '2026-05-05', 'Leucemia felina', '2027-05-05', 'Dr. Méndez', NULL),
(12, 10, 'Vacuna', '2026-11-11', 'Refuerzo anual de rabia', '2027-11-11', 'Dra. Gómez', 'Sin reacciones'),
(13, 11, 'Vacuna', '2025-10-19', 'Rabia', '2026-10-19', 'Carlos', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `mascotas`
--

CREATE TABLE `mascotas` (
  `id_mascota` int NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `raza` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sexo` enum('H','M') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `color` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `peso` decimal(5,2) DEFAULT NULL,
  `foto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_tipo_mascota` int NOT NULL,
  `id_usuario` int NOT NULL
) ;

--
-- Dumping data for table `mascotas`
--

INSERT INTO `mascotas` (`id_mascota`, `nombre`, `raza`, `sexo`, `fecha_nacimiento`, `color`, `peso`, `foto`, `id_tipo_mascota`, `id_usuario`) VALUES
(1, 'Luna', 'Golden Retriever', 'H', '2021-03-12', 'Dorado', 28.50, NULL, 1, 2),
(2, 'Michi', 'Mestizo', 'M', '2022-08-05', 'Atigrado', 4.20, NULL, 2, 2),
(3, 'Rocky', 'Bulldog francés', 'M', '2020-01-20', 'Blanco y negro', 12.00, NULL, 1, 2),
(4, 'Kiwi', 'Periquito', 'H', '2023-11-14', 'Verde', NULL, NULL, 3, 2),
(5, 'Copito', 'Hámster sirio', 'M', '2024-06-02', 'Blanco', NULL, NULL, 4, 2),
(6, 'Nala', 'Siamés', 'H', '2019-09-30', 'Crema', 3.80, NULL, 2, 2),
(7, 'Toby', 'Beagle', 'M', '2022-02-17', 'Tricolor', 11.30, NULL, 1, 3),
(8, 'Nemo', 'Pez payaso', 'M', '2024-01-10', 'Naranja', NULL, NULL, 5, 3),
(9, 'Lola', 'Persa', 'H', '2021-07-25', 'Gris', 4.60, NULL, 2, 4),
(10, 'Max', 'Labrador', 'M', '2023-05-15', 'Dorado', 18.50, 'https://ejemplo.com', 1, 1),
(11, 'Molly', 'Siames', 'H', '2023-05-25', 'Blanco con gris', 9.00, NULL, 2, 6);

-- --------------------------------------------------------

--
-- Table structure for table `tipo_mascota`
--

CREATE TABLE `tipo_mascota` (
  `id_tipo_mascota` int NOT NULL,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tipo_mascota`
--

INSERT INTO `tipo_mascota` (`id_tipo_mascota`, `nombre`, `descripcion`) VALUES
(1, 'Perro', 'Caninos domésticos de cualquier raza'),
(2, 'Gato', 'Felinos domésticos'),
(3, 'Ave', 'Periquitos, canarios, loros'),
(4, 'Roedor', 'Hámster, cobayo, conejo'),
(5, 'Otro', 'Peces, reptiles y otras especies');

-- --------------------------------------------------------

--
-- Table structure for table `tipo_usuario`
--

CREATE TABLE `tipo_usuario` (
  `id_tipo_usuario` int NOT NULL,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tipo_usuario`
--

INSERT INTO `tipo_usuario` (`id_tipo_usuario`, `nombre`) VALUES
(1, 'Administrador'),
(2, 'Usuario');

-- --------------------------------------------------------

--
-- Table structure for table `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_tipo_usuario` int NOT NULL DEFAULT '2'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `usuario`
--

--
-- Usuarios de prueba. Todas las contrasenas son '123456', guardadas como hash bcrypt (coste 10)
-- para que el login con bcrypt.compare funcione. El id 1 es Administrador (id_tipo_usuario = 1).
--

INSERT INTO `usuario` (`id_usuario`, `nombre`, `apellido`, `correo`, `contrasena`, `id_tipo_usuario`) VALUES
(1, 'Carlos', 'Ruiz', 'carlos.ruiz@correo.com', '$2b$10$9xgZZ/RHwK5uYR7r5tjEuOUTWgdiUcaYlNYr7SRq6h5TU1QfJmqYa', 1),
(2, 'María', 'Pérez', 'maria.perez@correo.com', '$2b$10$msw8yZmNjvGcAzMgvMya4eJUa.9bR3ZIztin1c8xIEHgiZ807LaEm', 2),
(3, 'José', 'Martínez', 'jose.martinez@correo.com', '$2b$10$DnWVvMK4qBUZ9PQjtzoKougH6m.Kcnc.bVL8nxc8vaeHC.qwzHJ2q', 2),
(4, 'Ana', 'Gómez', 'ana.gomez@correo.com', '$2b$10$kGQBDMbKE68dw/oAjqSVgOirArR4lHyblCFbAymQ7xnwLNZ5qk2Mi', 2),
(6, 'eilyn', 'angarita', 'eilyn.angarita@correo.com', '$2b$10$Qez1TN9J7LwQauTDd/sYd.BwvYC7GvEoCoXf8kKDSQL92PnppUggO', 2);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cuidados`
--
ALTER TABLE `cuidados`
  ADD PRIMARY KEY (`id_cuidado`),
  ADD KEY `idx_cuidados_mascota` (`id_mascota`,`tipo_cuidado`,`fecha`);

--
-- Indexes for table `mascotas`
--
ALTER TABLE `mascotas`
  ADD PRIMARY KEY (`id_mascota`),
  ADD KEY `idx_mascotas_usuario` (`id_usuario`),
  ADD KEY `idx_mascotas_tipo` (`id_tipo_mascota`),
  ADD KEY `idx_mascotas_nombre` (`nombre`);

--
-- Indexes for table `tipo_mascota`
--
ALTER TABLE `tipo_mascota`
  ADD PRIMARY KEY (`id_tipo_mascota`),
  ADD UNIQUE KEY `uq_tipo_mascota_nombre` (`nombre`);

--
-- Indexes for table `tipo_usuario`
--
ALTER TABLE `tipo_usuario`
  ADD PRIMARY KEY (`id_tipo_usuario`),
  ADD UNIQUE KEY `uq_tipo_usuario_nombre` (`nombre`);

--
-- Indexes for table `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `uq_usuario_correo` (`correo`),
  ADD KEY `fk_usuario_tipo_usuario` (`id_tipo_usuario`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cuidados`
--
ALTER TABLE `cuidados`
  MODIFY `id_cuidado` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mascotas`
--
ALTER TABLE `mascotas`
  MODIFY `id_mascota` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tipo_mascota`
--
ALTER TABLE `tipo_mascota`
  MODIFY `id_tipo_mascota` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tipo_usuario`
--
ALTER TABLE `tipo_usuario`
  MODIFY `id_tipo_usuario` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cuidados`
--
ALTER TABLE `cuidados`
  ADD CONSTRAINT `fk_cuidados_mascota` FOREIGN KEY (`id_mascota`) REFERENCES `mascotas` (`id_mascota`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `mascotas`
--
ALTER TABLE `mascotas`
  ADD CONSTRAINT `fk_mascotas_tipo_mascota` FOREIGN KEY (`id_tipo_mascota`) REFERENCES `tipo_mascota` (`id_tipo_mascota`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mascotas_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `fk_usuario_tipo_usuario` FOREIGN KEY (`id_tipo_usuario`) REFERENCES `tipo_usuario` (`id_tipo_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
