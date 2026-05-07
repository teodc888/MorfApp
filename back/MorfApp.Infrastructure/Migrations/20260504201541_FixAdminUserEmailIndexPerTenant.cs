using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixAdminUserEmailIndexPerTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_admin_users_email",
                table: "admin_users");

            migrationBuilder.DropIndex(
                name: "ix_admin_users_tenant_id",
                table: "admin_users");

            migrationBuilder.CreateIndex(
                name: "ix_admin_users_tenant_id_email",
                table: "admin_users",
                columns: new[] { "tenant_id", "email" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_admin_users_tenant_id_email",
                table: "admin_users");

            migrationBuilder.CreateIndex(
                name: "ix_admin_users_email",
                table: "admin_users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_admin_users_tenant_id",
                table: "admin_users",
                column: "tenant_id");
        }
    }
}
