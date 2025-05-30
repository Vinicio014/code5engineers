
create database FERRETERIA_REACT

go
use FERRETERIA_REACT

go

create table Rol(
idRol int primary key identity(1,1),
descripcion varchar(50),
esActivo bit,
fechaRegistro datetime default getdate()
)

go

create table Usuario(
idUsuario int primary key identity(1,1),
nombre varchar(40),
correo varchar(40),
telefono varchar(40),
idRol int references Rol(idRol),
clave varchar(40),
esActivo bit
)

go

create table Categoria(
idCategoria int primary key identity(1,1),
descripcion varchar(50),
esActivo bit,
fechaRegistro datetime default getdate()
)

go 
create table Producto (
idProducto int primary key identity(1,1),
codigo varchar(100),
marca varchar(100),
descripcion varchar(100),
idCategoria int references Categoria(idCategoria),
stock int,
precio decimal(10,2),
esActivo bit,
fechaRegistro datetime default getdate()
)

go

create table Venta(
idVenta int primary key identity(1,1),
numeroDocumento varchar(40),
tipoDocumento varchar(50),
fechaRegistro datetime default getdate(),
idUsuario int references Usuario(idUsuario),
documentoCliente varchar(40),
nombreCliente varchar(40),
subTotal decimal(10,2),
impuestoTotal decimal(10,2),
total decimal(10,2),
)

go

create table DetalleVenta(
idDetalleVenta int primary key identity(1,1),
idVenta int references Venta(idVenta),
idProducto int references Producto(idProducto),
cantidad int,
precio decimal(10,2),
total decimal(10,2)
)

go

create table NumeroDocumento(
id int primary key,
fechaRegistro datetime default getdate()
)

GO

--INSERTAR ROLES
insert into Rol(descripcion,esActivo) values ('Administrador',1)
insert into Rol(descripcion,esActivo) values ('Empleado',1)

go

--INSERTAR USUARIO
INSERT INTO Usuario(nombre,correo,telefono,idRol,clave,esActivo) values
('admin','admin@gmail.com','444333',1,'123',1),
('user','user@gmail.com','555666',2,'123',1)


go
--INSERTAR CATEGORIAS
insert into Categoria(descripcion,esActivo) values ('Electicidad',1)
go


insert into Producto(codigo,marca,descripcion,idCategoria,stock,precio,esActivo) values
('101010','Truper','Pelacables',1,20,50,1)

go

insert into NumeroDocumento(id) values(0)

go

create procedure sp_RegistrarVenta(
@documentoCliente varchar(40),
@nombreCliente varchar(40),
@tipoDocumento varchar(50),
@idUsuario int,
@subTotal decimal(10,2),
@impuestoTotal decimal(10,2),
@total decimal(10,2),
@productos xml,
@nroDocumento varchar(6) output
)
as
begin
	declare @nrodocgenerado varchar(6)
	declare @nro int
	declare @idventa int

	declare @tbproductos table (
	IdProducto int,
	Cantidad int,
	Precio decimal(10,2),
	Total decimal(10,2)
	)

	BEGIN TRY
		BEGIN TRANSACTION

			insert into @tbproductos(IdProducto,Cantidad,Precio,Total)
			select 
				nodo.elemento.value('IdProducto[1]','int') as IdProducto,
				nodo.elemento.value('Cantidad[1]','int') as Cantidad,
				nodo.elemento.value('Precio[1]','decimal(10,2)') as Precio,
				nodo.elemento.value('Total[1]','decimal(10,2)') as Total
			from @productos.nodes('Productos/Item') nodo(elemento)

			update NumeroDocumento set
			@nro = id= id+1
			
			set @nrodocgenerado =  RIGHT('000000' + convert(varchar(max),@nro),6)

			insert into Venta(numeroDocumento,tipoDocumento,idUsuario,documentoCliente,nombreCliente,subTotal,impuestoTotal,total) 
			values (@nrodocgenerado,@tipoDocumento,@idUsuario,@documentoCliente,@nombreCliente,@subTotal,@impuestoTotal,@total)


			set @idventa = SCOPE_IDENTITY()

			insert into DetalleVenta(idVenta,idProducto,cantidad,precio,total) 
			select @idventa,IdProducto,Cantidad,Precio,Total from @tbproductos

			update p set p.Stock = p.Stock - dv.Cantidad from PRODUCTO p
			inner join @tbproductos dv on dv.IdProducto = p.IdProducto

		COMMIT
		set @nroDocumento = @nrodocgenerado

	END TRY
	BEGIN CATCH
		ROLLBACK
		set @nroDocumento = ''
	END CATCH

end
