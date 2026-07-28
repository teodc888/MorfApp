using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionBilling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "mp_preapproval_id",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "subscription_charges",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    tenant_id = table.Column<string>(type: "text", nullable: false),
                    mp_payment_id = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    charged_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_subscription_charges", x => x.id);
                    table.ForeignKey(
                        name: "fk_subscription_charges_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_tenants_mp_preapproval_id",
                table: "tenants",
                column: "mp_preapproval_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_subscription_charges_mp_payment_id",
                table: "subscription_charges",
                column: "mp_payment_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_subscription_charges_tenant_id",
                table: "subscription_charges",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "subscription_charges");

            migrationBuilder.DropIndex(
                name: "ix_tenants_mp_preapproval_id",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "mp_preapproval_id",
                table: "tenants");
        }
    }
}
