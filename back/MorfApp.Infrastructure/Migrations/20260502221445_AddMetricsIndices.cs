using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMetricsIndices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_orders_tenant_id_status",
                table: "orders");

            migrationBuilder.CreateIndex(
                name: "ix_orders_confirmed_at",
                table: "orders",
                column: "confirmed_at");

            migrationBuilder.CreateIndex(
                name: "ix_orders_tenant_id_status_confirmed_at",
                table: "orders",
                columns: new[] { "tenant_id", "status", "confirmed_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_orders_confirmed_at",
                table: "orders");

            migrationBuilder.DropIndex(
                name: "ix_orders_tenant_id_status_confirmed_at",
                table: "orders");

            migrationBuilder.CreateIndex(
                name: "ix_orders_tenant_id_status",
                table: "orders",
                columns: new[] { "tenant_id", "status" });
        }
    }
}
