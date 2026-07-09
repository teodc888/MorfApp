using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BackfillAdminRoleOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // La migración AddAdminUserRole agregó la columna `role` con defaultValue "",
            // dejando a los admins existentes (que son los owners del tenant) sin rol.
            // Los empleados con login se crean explícitamente con role='employee', así que
            // cualquier admin con rol vacío/null es un owner.
            migrationBuilder.Sql(
                "UPDATE admin_users SET role = 'owner' WHERE role IS NULL OR role = '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No se revierte: no hay forma segura de distinguir qué owners tenían rol vacío.
        }
    }
}
