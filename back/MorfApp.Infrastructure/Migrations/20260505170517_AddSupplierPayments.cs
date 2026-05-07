using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "supplier_payment_allocations",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    tenant_id = table.Column<string>(type: "text", nullable: false),
                    supplier_payment_id = table.Column<string>(type: "text", nullable: false),
                    supply_purchase_id = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_supplier_payment_allocations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "supplier_payments",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    tenant_id = table.Column<string>(type: "text", nullable: false),
                    supplier_id = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    paid_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_supplier_payments", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_supplier_payment_allocations_supplier_payment_id",
                table: "supplier_payment_allocations",
                column: "supplier_payment_id");

            migrationBuilder.CreateIndex(
                name: "ix_supplier_payment_allocations_tenant_id_supply_purchase_id",
                table: "supplier_payment_allocations",
                columns: new[] { "tenant_id", "supply_purchase_id" });

            migrationBuilder.CreateIndex(
                name: "ix_supplier_payments_tenant_id_supplier_id_paid_at",
                table: "supplier_payments",
                columns: new[] { "tenant_id", "supplier_id", "paid_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "supplier_payment_allocations");

            migrationBuilder.DropTable(
                name: "supplier_payments");
        }
    }
}
