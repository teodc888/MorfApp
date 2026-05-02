using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "payment_configs",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    tenant_id = table.Column<string>(type: "text", nullable: false),
                    delivery_cash = table.Column<bool>(type: "boolean", nullable: false),
                    delivery_transfer = table.Column<bool>(type: "boolean", nullable: false),
                    delivery_card = table.Column<bool>(type: "boolean", nullable: false),
                    pickup_cash = table.Column<bool>(type: "boolean", nullable: false),
                    pickup_transfer = table.Column<bool>(type: "boolean", nullable: false),
                    pickup_card = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_payment_configs", x => x.id);
                    table.ForeignKey(
                        name: "fk_payment_configs_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_payment_configs_tenant_id",
                table: "payment_configs",
                column: "tenant_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "payment_configs");
        }
    }
}
